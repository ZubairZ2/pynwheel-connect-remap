# frozen_string_literal: true

require 'csv'
require 'open-uri'
require 'digest'
require 'set'

# UpdateApartmentListPropertiesWorker
#
# Updates existing property names and Apartment List URLs from a Google Sheet.
# This worker does NOT create or delete properties - it only updates existing ones.
#
# Behavior:
#   - Matches properties using fingerprint-based address matching
#   - Updates Community.name if Property Name is present in sheet
#   - Updates Credential.apartmentlist_url if URL is present in sheet
#   - Skips properties not found in database
#   - Processes updates in batches of 1000 for optimal performance
#
# Google Sheet:
#   - URL is configured in SHEET_CSV_URL constant
#   - Expected columns: Address, City, State, Zip, Property Name, URL
#
class UpdateApartmentListPropertiesWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'import_data', retry: 1

  # Google Sheet URL for updating properties
  SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1C3VWUdkzKJve95JfNNBg0SBgi58FOOis-qciKFo_2wE/export?format=csv&gid=1137384592'
  BATCH_SIZE = 1000

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

    # Build fingerprint-indexed map of all existing properties
    existing_properties = Community
      .active_client_properties
      .includes(:credential)
      .map { |p| [fingerprint(p.address, p.city, p.state, p.zip), p] }
      .to_h

    # Fetch CSV data from Google Sheet
    csv_data = URI.open(SHEET_CSV_URL).read

    if csv_data.lstrip.start_with?('<!doctype html')
      raise 'Google returned HTML instead of CSV. Check sheet sharing permissions.'
    end

    # Initialize counters and batch arrays
    updated_count = 0
    not_found_count = 0
    skipped_count = 0
    
    communities_to_update = []
    credentials_to_update = []
    credentials_to_create = []
    batch_count = 0

    # Process each row in the CSV
    CSV.parse(csv_data, headers: true, liberal_parsing: true, skip_blanks: true).each do |row|
      # Parse row data
      address = row['Address']&.strip
      city    = row['City']&.strip
      state   = row['State']&.strip&.upcase
      zip     = row['Zip']&.strip&.gsub(',', '')  # Google Sheets formats numbers with commas
      url     = row['URL']&.strip
      name    = row['Property Name']&.strip

      # Skip rows with missing required fields
      if address.blank? || city.blank? || state.blank?
        skipped_count += 1
        next
      end

      # Find matching property in database using fingerprint
      fp = fingerprint(address, city, state, zip)
      community = existing_properties[fp]

      # Skip if property not found in database
      if community.nil?
        not_found_count += 1
        next
      end

      # Track if any updates are needed
      needs_update = false

      # Update property name if provided and different
      if name.present? && community.name != name
        community.name = name
        needs_update = true
      end

      # Update address if provided and different
      if address.present? && community.address != address
        community.address = address
        needs_update = true
      end

      # Update city if provided and different
      if city.present? && community.city != city
        community.city = city
        needs_update = true
      end

      # Update state if provided and different
      if state.present? && community.state != state
        community.state = state
        needs_update = true
      end

      # Update zip if provided and different
      if zip.present? && community.zip != zip
        community.zip = zip
        needs_update = true
      end

      # Update or create apartmentlist_url if provided
      if url.present?
        if community.credential.nil?
          # Create new credential
          credential = Credential.new(
            community_id: community.id,
            created_at: now,
            updated_at: now,
            apartmentlist_url: url
          )
          credentials_to_create << credential
          needs_update = true
        elsif community.credential.apartmentlist_url != url
          # Update existing credential
          community.credential.apartmentlist_url = url
          community.credential.updated_at = now
          credentials_to_update << community.credential
          needs_update = true
        end
      end

      # Add to batch if updates are needed
      if needs_update
        community.updated_at = now
        communities_to_update << community
        updated_count += 1
      end

      # Process batch when it reaches BATCH_SIZE
      if communities_to_update.size >= BATCH_SIZE
        bulk_update!(communities_to_update, credentials_to_update, credentials_to_create)
        batch_count += 1
        Rails.logger.info "Processed batch #{batch_count}: #{communities_to_update.size} communities"
        
        # Clear arrays for next batch
        communities_to_update.clear
        credentials_to_update.clear
        credentials_to_create.clear
      end
    end

    # Process remaining items in final batch
    if communities_to_update.any?
      bulk_update!(communities_to_update, credentials_to_update, credentials_to_create)
      Rails.logger.info "Processed final batch: #{communities_to_update.size} communities"
    end

    # Log summary
    Rails.logger.info "Update completed: #{updated_count} updated, #{not_found_count} not found, #{skipped_count} skipped"
  end

  private

  # ============================================================================
  # Bulk Update Methods
  # ============================================================================

  def bulk_update!(communities, credentials_to_update, credentials_to_create)
    return if communities.empty?

    connection = ActiveRecord::Base.connection
    updated_at_value = connection.quote(communities.first.updated_at)
    
    # Bulk update community fields using SQL CASE statements
    community_ids = communities.map(&:id)
    name_cases = communities.map { |c| "WHEN #{c.id} THEN #{connection.quote(c.name)}" }.join(' ')
    address_cases = communities.map { |c| "WHEN #{c.id} THEN #{connection.quote(c.address)}" }.join(' ')
    city_cases = communities.map { |c| "WHEN #{c.id} THEN #{connection.quote(c.city)}" }.join(' ')
    state_cases = communities.map { |c| "WHEN #{c.id} THEN #{connection.quote(c.state)}" }.join(' ')
    zip_cases = communities.map { |c| "WHEN #{c.id} THEN #{connection.quote(c.zip)}" }.join(' ')
    
    Community.where(id: community_ids).update_all(
      "name = CASE id #{name_cases} END, " \
      "address = CASE id #{address_cases} END, " \
      "city = CASE id #{city_cases} END, " \
      "state = CASE id #{state_cases} END, " \
      "zip = CASE id #{zip_cases} END, " \
      "updated_at = #{updated_at_value}"
    )

    # Bulk create new credentials
    if credentials_to_create.any?
      Credential.import(credentials_to_create, validate: false)
    end

    # Bulk update existing credential URLs using SQL CASE statement
    if credentials_to_update.any?
      credential_ids = credentials_to_update.map(&:id)
      url_cases = credentials_to_update.map { |c| "WHEN #{c.id} THEN #{connection.quote(c.apartmentlist_url)}" }.join(' ')
      
      Credential.where(id: credential_ids).update_all(
        "apartmentlist_url = CASE id #{url_cases} END, updated_at = #{updated_at_value}"
      )
    end
  end

  # ============================================================================
  # Fingerprint & Normalization Methods
  # ============================================================================

  # Generate unique fingerprint for a property based on normalized address components
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

  # Normalize address by combining with city and removing street type suffixes
  def normalize_address(address, city)
    combined = "#{address} #{city}"
    normalize(combined)
      .gsub(/\b(lane|ln|street|st|avenue|ave|road|rd|drive|dr|circle|cir)\b/, '')
      .squeeze(' ')
      .strip
  end

  # Normalize city name by removing street type suffixes
  def normalize_city(city)
    normalize(city)
      .gsub(/\b(lane|ln|street|st|avenue|ave|road|rd|drive|dr|circle|cir)\b/, '')
      .strip
  end

  # Normalize state to 2-letter abbreviation
  def normalize_state(state)
    return '' if state.blank?

    value = state.to_s.downcase.gsub(/[^\w\s]/, '').strip
    STATE_MAP[value] || (value.length == 2 ? value.upcase : value.upcase)
  end

  # Base normalization: lowercase, replace special chars with spaces, convert street types
  def normalize(value)
    return '' if value.blank?

    normalized = value.downcase.gsub(/[^\w\s]/, ' ').squeeze(' ').strip
    STREET_MAP.each { |long, short| normalized.gsub!(/\b#{long}\b/, short) }
    normalized
  end
end
