# frozen_string_literal: true

require 'csv'
require 'open-uri'
require 'digest'

class ApartmentlistMapsReportService < BaseService
  PARTNER = 'apartmentlist'
  SHEET_URL = ENV['APARTMENTLIST_PROPERTIES_URL']

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

  
  # example:
  # https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=...

  def initialize
    @communities_by_fingerprint = nil
  end

  def get_report
    csv_data = URI.open(SHEET_URL).read

    rows = CSV.parse(
      csv_data,
      headers: true,
      liberal_parsing: true,
      skip_blanks: true
    )

    # Load all communities once and build fingerprint hash map
    build_communities_fingerprint_map

    CSV.generate(headers: true) do |csv|
      csv << output_headers(rows.headers)

      rows.each do |row|
        csv << build_row(row)
      end
    end
  end

  private

  # ----------------------------
  # Headers
  # ----------------------------
  def output_headers(original_headers)
    original_headers + [
      'Property ID',
      'Map Link',
      'Map Embed Code'
    ]
  end

  # ----------------------------
  # Row builder
  # ----------------------------
  def build_row(row)
    address = row['Address']
    city    = row['City']
    state   = row['State']
    zip     = row['Zip']

    community = find_community(address, city, state, zip)

    property_id = community&.id
    map_link    = community&.map_link(PARTNER)
    map_embed_code    = community&.map_embed_code(PARTNER)

    row.fields + [
      property_id,
      map_link,
      map_embed_code
    ]
  end

  # ----------------------------
  # Build fingerprint hash map (called once)
  # ----------------------------
  def build_communities_fingerprint_map
    @communities_by_fingerprint = {}

    Community.active_client_properties.find_each do |community|
      fp = fingerprint(
        community.address,
        community.city,
        community.state,
        community.zip
      )
      @communities_by_fingerprint[fp] = community
    end
  end

  # ----------------------------
  # Community lookup (fingerprint) - now uses hash map
  # ----------------------------
  def find_community(address, city, state, zip)
    return if address.blank? || city.blank? || state.blank?

    fp = fingerprint(address, city, state, zip)
    @communities_by_fingerprint[fp]
  end

  # ----------------------------
  # Fingerprint logic (same idea)
  # ----------------------------
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
end