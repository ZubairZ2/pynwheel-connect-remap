class XmlService < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
  end

  def perform
    @unit_record = []
    property_ids = credentials.xml_domain.to_s.split(',').map(&:strip)

    community = Community.find_by(id: credentials.community_id)
    community&.community_data_updated_on

    property_ids.each do |property_id|
      process_property(property_id)
    end
  end

  private

  # ----------------------------------------------------
  # Main property processing
  # ----------------------------------------------------
  def process_property(property_id)
    response = fetch_xml
    property = find_property(response, property_id)

    unless property
      notify_no_match(response)
      return
    end

    property = sanitize_xml(property)

    units      = Array(property['ILS_Unit'])
    floorplans = Array(property['Floorplan'])

    save_xml_floorplans(floorplans, property_id)
    save_xml_units(units, property_id)
  rescue => e
    # Swallow per-property failure to avoid stopping the job
  end

  # ----------------------------------------------------
  # XML helpers
  # ----------------------------------------------------
  def fetch_xml
    HTTParty.get(URI::DEFAULT_PARSER.escape(file_url))
  end

  def find_property(response, domain)
    domain = domain.to_s.strip

    properties = Array(response.dig('PhysicalProperty', 'Property'))

    properties.find do |p|
      ids = p.dig('PropertyID', 'Identification')
      next false unless ids

      ids['SecondaryID'].to_s.strip == domain ||
        ids['PrimaryID'].to_s.strip == domain
    end
  end

    def find_property(response, domain)
    property_node = response.dig('PhysicalProperty', 'Property')
    return nil if property_node.blank?

    # Normalize to array
    properties = if property_node.is_a?(Array)
                  property_node
                elsif property_node.is_a?(Hash)
                  [property_node]
                else
                  []
                end

    properties.find do |property|
      ids = property.dig('PropertyID', 'Identification')
      next false unless ids

      ids['SecondaryID'].to_s.strip == domain.to_s.strip ||
        ids['PrimaryID'].to_s.strip == domain.to_s.strip
    end
  end

  def sanitize_xml(data)
    data.to_s.gsub('xsi:', '').yield_self { |str| eval(str) }
  end

  # ----------------------------------------------------
  # Units
  # ----------------------------------------------------
  def save_xml_units(units, property_id)
    existing_unit_ids = Unit
      .where(community_id: credentials.community_id, provider: 'xml')
      .pluck(:provider_unit_id)

    units.each do |u|
      process_unit(u, property_id)
    end

    mark_missing_units(existing_unit_ids)
  end

  def process_unit(u, property_id)
    unit = Unit.where(
      provider: 'xml',
      community_id: credentials.community_id,
      provider_unit_id: u['Id']
    ).first_or_initialize

    return if unit.manual_override

    update_unit_fields(unit, u, property_id)

    @unit_record << unit.provider_unit_id
    unit.manually_updated = false
    unit.save(validate: false)
  rescue
  end

  def update_unit_fields(unit, u, property_id)
    unit.property_id ||= property_id
    unit.unit_type ||= u.dig('Unit', 'Information', 'UnitType')

    set_marketing_name(unit, u)
    set_floorplan(unit, u)
    set_effective_rent(unit, u)
    set_availability(unit, u)
    set_available_date(unit, u)
  end

  def set_marketing_name(unit, u)
    return if unit.name_is_updated
    unit.marketing_name = get_marketing_name(u)
  end

  def set_floorplan(unit, u)
    return if unit.floorplan_id_is_updated
    unit.floorplan_id = u['FloorplanID']
  end

  def set_effective_rent(unit, u)
    return if unit.effective_rent_is_updated && unit.manual_override

    unit.effective_rent = u.dig('EffectiveRent', 'Min') ||
                           u.dig('EffectiveRent', 'Avg') ||
                           1.0

    unit.min_effective_rent = u.dig('EffectiveRent', 'Min')
    unit.max_effective_rent = u.dig('EffectiveRent', 'Max')
  end

  def set_availability(unit, u)
    availability = u['Availability']
    return unless availability

    unless unit.availability_is_updated && unit.manual_override
      unit.availability = availability['VacancyClass'] unless unit.sold
    end

    unless unit.available_is_updated && unit.manual_override
      unit.available = availability['VacancyClass'] == 'Unoccupied' && !unit.sold
    end
  end

  def set_available_date(unit, u)
    return if unit.available_date_is_updated && unit.manual_override

    date = u.dig('Availability', 'VacateDate')
    return unless date

    unit.available_date = Date.parse("#{date['Year']}-#{date['Month']}-#{date['Day']}")
  end

  def mark_missing_units(existing_ids)
    missing = existing_ids - @unit_record

    missing.each do |unit_id|
      unit = Unit.find_by(
        community_id: credentials.community_id,
        provider_unit_id: unit_id
      )

      next if unit&.manual_override

      unit.update_columns(
        availability: 'Occupied',
        available: false,
        available_date: nil
      )
    end
  end

  # ----------------------------------------------------
  # Floorplans
  # ----------------------------------------------------
  def save_xml_floorplans(floorplans, property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(
        provider: 'xml',
        community_id: credentials.community_id,
        provider_floorplan_id: f['Id']
      ).first_or_initialize

      update_floorplan_fields(floorplan, f, property_id)
      floorplan.save(validate: false)
    end
  end

  def update_floorplan_fields(fp, f, property_id)
    fp.property_id ||= property_id
    fp.name ||= f['Name']
    fp.unit_count = f['UnitCount']
    fp.units_available = f['DisplayedUnitsAvailable']
    fp.availability_url ||= f['FloorplanAvailabilityURL']

    fp.bedrooms ||= f.dig('Room', 0, 'Count')
    fp.bathrooms ||= f.dig('Room', 1, 'Count')

    unless fp.square_feet_is_updated
      fp.square_feet = f.dig('SquareFeet', 'Min').to_f > 0 ?
                       f.dig('SquareFeet', 'Min') :
                       f.dig('SquareFeet', 'Max')
    end

    unless fp.market_rent_is_updated
      fp.market_rent = f.dig('MarketRent', 'Min').to_f > 0 ?
                       f.dig('MarketRent', 'Min') :
                       f.dig('MarketRent', 'Max')
    end
  end

  # ----------------------------------------------------
  # Utilities
  # ----------------------------------------------------
  def file_url
    filename = credentials.xml_filename
    xml = filename.end_with?('.xml') ? filename : "#{filename}.xml"
    "http://pynwheel.com/swoop/datafeeds/#{xml}"
  end

  def notify_no_match(response)
    ExceptionNotifier.notify_exception(
      Exception.new,
      data: {
        message: response.dig('response', 'error', 'message'),
        community_id: credentials.community_id
      }
    )
  end

  def get_marketing_name(u)
    u.dig('Unit', 'MarketingName', '__content__') ||
      u.dig('Unit', 'MarketingName')
  rescue
    u.dig('Unit', 'MarketingName')
  end
end