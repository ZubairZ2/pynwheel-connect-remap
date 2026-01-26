# frozen_string_literal: true

require 'csv'
require 'open-uri'
require 'digest'
require 'set'

class ImportApartmentListPropertiesWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'import_data', retry: 3

  APARTMENTLIST_API_KEY = ENV['PARTNER_APARTMENTLIST_API_KEY']
  DRIVE_CSV_URL = ENV['APARTMENTLIST_PROPERTIES_URL']
  BATCH_SIZE    = 1000

  STATE_MAP = {
    'alabama' => 'AL',
    'alaska' => 'AK',
    'arizona' => 'AZ',
    'arkansas' => 'AR',
    'california' => 'CA',
    'colorado' => 'CO',
    'connecticut' => 'CT',
    'delaware' => 'DE',
    'florida' => 'FL',
    'georgia' => 'GA',
    'hawaii' => 'HI',
    'idaho' => 'ID',
    'illinois' => 'IL',
    'indiana' => 'IN',
    'iowa' => 'IA',
    'kansas' => 'KS',
    'kentucky' => 'KY',
    'louisiana' => 'LA',
    'maine' => 'ME',
    'maryland' => 'MD',
    'massachusetts' => 'MA',
    'michigan' => 'MI',
    'minnesota' => 'MN',
    'mississippi' => 'MS',
    'missouri' => 'MO',
    'montana' => 'MT',
    'nebraska' => 'NE',
    'nevada' => 'NV',
    'new hampshire' => 'NH',
    'new jersey' => 'NJ',
    'new mexico' => 'NM',
    'new york' => 'NY',
    'north carolina' => 'NC',
    'north dakota' => 'ND',
    'ohio' => 'OH',
    'oklahoma' => 'OK',
    'oregon' => 'OR',
    'pennsylvania' => 'PA',
    'rhode island' => 'RI',
    'south carolina' => 'SC',
    'south dakota' => 'SD',
    'tennessee' => 'TN',
    'texas' => 'TX',
    'utah' => 'UT',
    'vermont' => 'VT',
    'virginia' => 'VA',
    'washington' => 'WA',
    'west virginia' => 'WV',
    'wisconsin' => 'WI',
    'wyoming' => 'WY'
  }.freeze

  STREET_MAP = {
    'street'    => 'st',
    'avenue'    => 'ave',
    'boulevard' => 'blvd',
    'road'      => 'rd',
    'lane'      => 'ln',
    'drive'     => 'dr',
    'court'     => 'ct',
    'place'     => 'pl',
    'circle'    => 'cir',
    'parkway'   => 'pkwy',
    'way'       => 'way'
  }.freeze

  def perform
    now = Time.current

    beans_company = Company.find_or_create_by!(name: 'Beans')
    beans_company.data_providers << 'beans' unless beans_company.data_providers.include?('beans')
    beans_company.save!

    existing_fingerprints = Community
      .active_client_properties
      .pluck(:address, :city, :state, :zip)
      .map { |a, c, s, z| fingerprint(a, c, s, z) }
      .to_set

    csv_data = URI.open(DRIVE_CSV_URL).read

    if csv_data.lstrip.start_with?('<!doctype html')
      raise 'Google returned HTML instead of CSV. Check sheet sharing permissions.'
    end

    seen_fingerprints = Set.new
    batch = []

    CSV.parse(
      csv_data,
      headers: true,
      liberal_parsing: true,
      skip_blanks: true
    ).each do |row|
      address = row['Address']&.strip
      city    = row['City']&.strip
      state   = row['State']&.strip&.upcase
      zip     = row['Zip']&.strip
      url     = row['Url']&.strip
      name    = row['Name']&.strip

      next if address.blank? || city.blank? || state.blank?

      fp = fingerprint(address, city, state, zip)

      next if seen_fingerprints.include?(fp)
      next if existing_fingerprints.include?(fp)

      seen_fingerprints << fp

      community = Community.new(
        name: name,
        address: address,
        city: city,
        state: state,
        zip: zip,
        company_id: beans_company.id,
        enable_three_d_maps: true,
        touchscreen_app: false,
        data_provider: 'beans',
        is_sitemap: true,
        created_at: now,
        updated_at: now
      )

      # Associated records
      community.build_credential(created_at: now, updated_at: now, apartmentlist_url: url)
      community.build_map_filter(created_at: now, updated_at: now)
      community.build_design(created_at: now, updated_at: now)

      if APARTMENTLIST_API_KEY.present?
        community.map_partners.build(
          partner: 'apartmentlist',
          api_key: APARTMENTLIST_API_KEY,
          created_at: now,
          updated_at: now
        )
      end

      batch << community

      if batch.size >= BATCH_SIZE
        bulk_insert!(batch)
        batch.clear
      end
    end

    bulk_insert!(batch) if batch.any?
  end

  private

  def fingerprint(address, city, state, zip)
    Digest::SHA1.hexdigest(
      [
        normalize_address(address, city),
        normalize_city(city),
        normalize_state(state),
        zip.to_s.strip
      ].join('|')
    )
  end

  def normalize_address(address, city)
    combined = "#{address} #{city}"
    normalize(combined)
      .gsub(/\b(lane|ln|street|st|avenue|ave|road|rd|drive|dr|circle|cir)\b/, '')
      .squeeze(' ')
      .strip
  end

  def normalize_city(city)
    normalize(city)
      .gsub(/\b(lane|ln|street|st|avenue|ave|road|rd|drive|dr|circle|cir)\b/, '')
      .strip
  end

  def normalize_state(state)
    return '' if state.blank?

    value = state.to_s.downcase.gsub(/[^\w\s]/, '').strip
    STATE_MAP[value] || (value.length == 2 ? value.upcase : value.upcase)
  end

  def normalize(value)
    return '' if value.blank?

    normalized = value.downcase.gsub(/[^\w\s]/, ' ').squeeze(' ').strip
    STREET_MAP.each { |long, short| normalized.gsub!(/\b#{long}\b/, short) }
    normalized
  end

  def bulk_insert!(records)
    Community.import!(
      records,
      validate: false,
      recursive: true # ✅ ensures associated credential is inserted as well
    )
  end

  def generate_random_username(address, city)
    "#{address.parameterize(separator: '_')}_#{city.parameterize(separator: '_')}_#{SecureRandom.hex(3)}"
  end
end