class XmlStaticService < BaseService
  def perform
    property_ids = credentials.xml_domain.to_s.split(',').map(&:strip)
    return if property_ids.blank?

    response = fetch_xml
    return unless response

    property_ids.each do |property_id|
      property = find_property(response, property_id)

      unless property
        notify_error("No matching property found", property_id)
        next
      end

      building_map = extract_buildings(property)

      units      = Array(property['ILS_Unit'])
      floorplans = Array(property['Floorplan'])

      save_xml_floorplans(floorplans, property_id)
      save_xml_units(units, property_id, building_map)
    end
  rescue StandardError => e
    ExceptionNotifier.notify_exception(e, data: { community_id: credentials.community_id })
  end

  # ------------------------------------------------------------------
  # XML helpers
  # ------------------------------------------------------------------

  def fetch_xml
    HTTParty.get(URI::DEFAULT_PARSER.escape(file_url))
  rescue StandardError => e
    ExceptionNotifier.notify_exception(e, data: { community_id: credentials.community_id })
    nil
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

  # ------------------------------------------------------------------
  # Units
  # ------------------------------------------------------------------

  def save_xml_units(units, property_id, building_map)
    units.each { |u| upsert_unit(u, property_id, building_map) }
  end

  def upsert_unit(u, property_id, building_map)
    unit = Unit.where(
      provider: 'xml',
      community_id: credentials.community_id,
      provider_unit_id: u['Id']
    ).first_or_initialize

    return if unit.manual_override

    unit.property_id = property_id
    unit.unit_type   = u.dig('Unit', 'Information', 'UnitType')
    unit.marketing_name ||= get_marketing_name(u)
    unit.floorplan_id ||= u['FloorplanID']

    apply_rent(unit, u)
    apply_availability(unit, u)

    unit.square_feet = u.dig('Unit', 'Information', 'MinSquareFeet')
    unit.building = resolve_building_name(u, building_map)

    unit.manually_updated = false
    unit.save(validate: false)
  rescue StandardError
    nil
  end

  def resolve_building_name(u, building_map)
    building_id = u['BuildingID']&.to_s
    building_map[building_id]
  end

  def apply_rent(unit, u)
    return if unit.effective_rent_is_updated && unit.manual_override

    unit.effective_rent =
      u.dig('EffectiveRent', 'Min') ||
      u.dig('EffectiveRent', 'Avg') ||
      1.0

    unit.min_effective_rent = u.dig('EffectiveRent', 'Min')
    unit.max_effective_rent = u.dig('EffectiveRent', 'Max')
  end

  def apply_availability(unit, u)
    availability = u['Availability']
    return unless availability

    unless unit.availability_is_updated && unit.manual_override
      unit.availability = availability['VacancyClass']
    end

    unless unit.available_is_updated && unit.manual_override
      unit.available = availability['VacancyClass'] == 'Unoccupied'
    end

    unless unit.available_date_is_updated && unit.manual_override
      unit.available_date = parse_vacate_date(availability)
    end

    unit.availability_url = availability['UnitAvailabilityURL']
  end

  def parse_vacate_date(availability)
    date = availability['VacateDate']
    return unless date

    Date.parse("#{date['Year']}-#{date['Month']}-#{date['Day']}")
  rescue StandardError
    nil
  end

  # ------------------------------------------------------------------
  # Floorplans
  # ------------------------------------------------------------------

  def save_xml_floorplans(floorplans, property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(
        provider: 'xml',
        community_id: credentials.community_id,
        provider_floorplan_id: f['Id']
      ).first_or_initialize

      floorplan.property_id = property_id
      floorplan.name ||= f['Name']
      floorplan.unit_count = f['UnitCount']
      floorplan.units_available = f['DisplayedUnitsAvailable']
      floorplan.availability_url = f['FloorplanAvailabilityURL']

      apply_floorplan_details(floorplan, f)
      floorplan.save(validate: false)
    end
  end

  def apply_floorplan_details(fp, f)
    fp.bedrooms ||= f.dig('Room', 0, 'Count')
    fp.bathrooms ||= f.dig('Room', 1, 'Count')

    unless fp.square_feet_is_updated
      fp.square_feet =
        f.dig('SquareFeet', 'Min').to_f.positive? ?
          f.dig('SquareFeet', 'Min') :
          f.dig('SquareFeet', 'Max')
    end

    unless fp.market_rent_is_updated
      fp.market_rent =
        f.dig('MarketRent', 'Min').to_f.positive? ?
          f.dig('MarketRent', 'Min') :
          f.dig('MarketRent', 'Max')
    end
  end

  # ------------------------------------------------------------------
  # Utils
  # ------------------------------------------------------------------

  def extract_buildings(property)
    building_node = property['Building']
    return {} if building_node.blank?

    buildings = building_node.is_a?(Array) ? building_node : [building_node]

    buildings.each_with_object({}) do |b, map|
      id   = b['Id']&.to_s
      name = b['Name']&.to_s
      map[id] = name if id.present?
    end
  end

  def file_url
    filename = credentials.xml_filename
    xml_file = filename.end_with?('.xml') ? filename : "#{filename}.xml"
    "http://pynwheel.com/swoop/datafeeds/#{xml_file}"
  end

  def get_marketing_name(u)
    u.dig('Unit', 'MarketingName', '__content__') ||
      u.dig('Unit', 'MarketingName')
  rescue StandardError
    nil
  end

  def notify_error(message, property_id)
    ExceptionNotifier.notify_exception(
      Exception.new(message),
      data: {
        property_id: property_id,
        community_id: credentials.community_id
      }
    )
  end
end