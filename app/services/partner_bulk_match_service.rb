# frozen_string_literal: true

require 'csv'

# Parses an uploaded CSV / Excel bulk-assign sheet and matches each row against
# existing Community records so a super admin can assign map partners to many
# properties at once.
#
# Each row is classified as:
#   "exact"     – confidently resolved to a single existing property
#   "partial"   – one or more likely candidates (user picks the right one)
#   "unmatched" – no property in the CMS looks like this row
#
# The address / name normalization mirrors ImportApartmentListPropertiesWorker so
# matching behaves consistently with the ApartmentList importer.
class PartnerBulkMatchService
  MAX_CANDIDATES = 6

  # Columns we understand, and the header spellings we accept for each.
  HEADER_ALIASES = {
    company: ['company', 'company name', 'management company', 'owner'],
    name:    ['property name', 'property', 'name', 'community', 'community name'],
    address: ['address', 'street address', 'street', 'address 1', 'address1'],
    city:    ['city', 'town'],
    state:   ['state', 'st', 'province'],
    zip:     ['zip', 'zipcode', 'zip code', 'postal code', 'postal', 'postcode']
  }.freeze

  STATE_MAP = {
    'alabama' => 'AL', 'alaska' => 'AK', 'arizona' => 'AZ', 'arkansas' => 'AR',
    'california' => 'CA', 'colorado' => 'CO', 'connecticut' => 'CT', 'delaware' => 'DE',
    'florida' => 'FL', 'georgia' => 'GA', 'hawaii' => 'HI', 'idaho' => 'ID',
    'illinois' => 'IL', 'indiana' => 'IN', 'iowa' => 'IA', 'kansas' => 'KS',
    'kentucky' => 'KY', 'louisiana' => 'LA', 'maine' => 'ME', 'maryland' => 'MD',
    'massachusetts' => 'MA', 'michigan' => 'MI', 'minnesota' => 'MN', 'mississippi' => 'MS',
    'missouri' => 'MO', 'montana' => 'MT', 'nebraska' => 'NE', 'nevada' => 'NV',
    'new hampshire' => 'NH', 'new jersey' => 'NJ', 'new mexico' => 'NM', 'new york' => 'NY',
    'north carolina' => 'NC', 'north dakota' => 'ND', 'ohio' => 'OH', 'oklahoma' => 'OK',
    'oregon' => 'OR', 'pennsylvania' => 'PA', 'rhode island' => 'RI', 'south carolina' => 'SC',
    'south dakota' => 'SD', 'tennessee' => 'TN', 'texas' => 'TX', 'utah' => 'UT',
    'vermont' => 'VT', 'virginia' => 'VA', 'washington' => 'WA', 'west virginia' => 'WV',
    'wisconsin' => 'WI', 'wyoming' => 'WY', 'district of columbia' => 'DC'
  }.freeze

  STREET_MAP = {
    'street' => 'st', 'avenue' => 'ave', 'boulevard' => 'blvd', 'road' => 'rd',
    'lane' => 'ln', 'drive' => 'dr', 'court' => 'ct', 'place' => 'pl',
    'circle' => 'cir', 'parkway' => 'pkwy', 'way' => 'way'
  }.freeze

  # -------------------------------------------------------------------------
  # File parsing
  # -------------------------------------------------------------------------

  # Reads an uploaded file (ActionDispatch::Http::UploadedFile) into an array of
  # normalized row hashes: { company:, name:, address:, city:, state:, zip: }.
  # Raises with a user-friendly message on unreadable input.
  def self.parse_upload(uploaded)
    ext = File.extname(uploaded.original_filename.to_s).downcase.delete('.')

    raw =
      case ext
      when 'csv', 'txt', ''
        CSV.read(uploaded.path, headers: false, liberal_parsing: true, skip_blanks: true).to_a
      when 'xlsx', 'xls'
        sheet = Roo::Spreadsheet.open(uploaded.path, extension: ext.to_sym).sheet(0)
        last  = sheet.last_row.to_i
        (1..last).map { |i| sheet.row(i) }
      else
        raise "Unsupported file type “.#{ext}”. Please upload a .csv, .xlsx, or .xls file."
      end

    return [] if raw.blank?

    header = Array(raw.shift).map { |h| h.to_s.strip.downcase }
    col = {}
    HEADER_ALIASES.each do |key, aliases|
      idx = header.index { |h| aliases.include?(h) }
      col[key] = idx unless idx.nil?
    end

    if col[:name].nil? && col[:address].nil?
      raise 'Could not find a "Property Name" or "Address" column. Download the template for the expected format.'
    end

    raw.filter_map do |r|
      next if r.nil? || r.all? { |c| c.to_s.strip.empty? }

      {
        company: cell(r, col[:company]),
        name:    cell(r, col[:name]),
        address: cell(r, col[:address]),
        city:    cell(r, col[:city]),
        state:   cell(r, col[:state]),
        zip:     cell(r, col[:zip])
      }
    end
  end

  def self.cell(row, idx)
    return nil if idx.nil?

    value = row[idx]
    value.is_a?(String) ? value.strip : value&.to_s&.strip
  end
  private_class_method :cell

  # -------------------------------------------------------------------------
  # Matching
  # -------------------------------------------------------------------------

  def initialize(scope: Community.active_client_properties)
    @scope = scope
    build_index
  end

  # rows: Array of hashes from .parse_upload. Returns an array of result hashes.
  def match(rows)
    rows.each_with_index.map { |row, i| classify(row, i) }
  end

  private

  def build_index
    @by_fp       = {}
    @by_fp_nozip = Hash.new { |h, k| h[k] = [] }
    @by_name_st  = Hash.new { |h, k| h[k] = [] }

    columns = ['communities.id', 'communities.name', 'communities.code',
               'communities.address', 'communities.city', 'communities.state',
               'communities.zip', 'companies.name']

    @scope.left_joins(:company).pluck(*columns).each do |id, name, code, address, city, state, zip, company_name|
      rec = { id: id, name: name, code: code, address: address, city: city,
              state: state, zip: zip, company_name: company_name }

      if address.present?
        @by_fp[fingerprint(address, city, state, zip)] ||= rec
        @by_fp_nozip[fingerprint(address, city, state, nil)] << rec
      end
      @by_name_st["#{normalize_name(name)}|#{normalize_state(state)}"] << rec if name.present?
    end
  end

  def classify(row, idx)
    address = row[:address].to_s.strip
    city    = row[:city].to_s.strip
    state   = row[:state].to_s.strip
    zip     = row[:zip].to_s.strip
    name    = row[:name].to_s.strip

    base = { index: idx, input: { company: row[:company], name: name, address: address,
                                  city: city, state: state, zip: zip } }

    # 1) Exact by full fingerprint (address + city + state + zip).
    if address.present? && zip.present? && (rec = @by_fp[fingerprint(address, city, state, zip)])
      return base.merge(status: 'exact', match: present(rec))
    end

    # 2) Exact when address + city + state resolves to exactly one property.
    nozip = @by_fp_nozip[fingerprint(address, city, state, nil)].uniq { |r| r[:id] } if address.present?
    nozip ||= []
    return base.merge(status: 'exact', match: present(nozip.first)) if nozip.size == 1

    # 3) Otherwise gather candidates (address near-matches + same name & state).
    candidates = nozip.dup
    candidates.concat(@by_name_st["#{normalize_name(name)}|#{normalize_state(state)}"]) if name.present?
    candidates.uniq! { |r| r[:id] }

    if candidates.any?
      return base.merge(status: 'partial', candidates: candidates.first(MAX_CANDIDATES).map { |r| present(r) })
    end

    base.merge(status: 'unmatched')
  end

  def present(rec)
    {
      id: rec[:id],
      name: rec[:name],
      code: rec[:code],
      company: rec[:company_name],
      location: [rec[:city], rec[:state]].reject(&:blank?).join(', ')
    }
  end

  # --- normalization (mirrors ImportApartmentListPropertiesWorker) ----------

  def fingerprint(address, city, state, zip)
    Digest::SHA1.hexdigest(
      [normalize_address(address, city), normalize_city(city), normalize_state(state), zip.to_s.strip].join('|')
    )
  end

  def normalize_address(address, city)
    normalize("#{address} #{city}")
      .gsub(/\b(lane|ln|street|st|avenue|ave|road|rd|drive|dr|circle|cir)\b/, '')
      .squeeze(' ').strip
  end

  def normalize_city(city)
    normalize(city)
      .gsub(/\b(lane|ln|street|st|avenue|ave|road|rd|drive|dr|circle|cir)\b/, '')
      .strip
  end

  def normalize_name(name)
    return '' if name.blank?

    name.to_s.downcase.gsub(/\b(the|apartments|apartment|apts|at|on|of)\b/, ' ')
        .gsub(/[^a-z0-9]/, ' ').squeeze(' ').strip
  end

  def normalize_state(state)
    return '' if state.blank?

    value = state.to_s.downcase.gsub(/[^\w\s]/, '').strip
    STATE_MAP[value] || value.upcase
  end

  def normalize(value)
    return '' if value.blank?

    normalized = value.downcase.gsub(/[^\w\s]/, ' ').squeeze(' ').strip
    STREET_MAP.each { |long, short| normalized.gsub!(/\b#{long}\b/, short) }
    normalized
  end
end
