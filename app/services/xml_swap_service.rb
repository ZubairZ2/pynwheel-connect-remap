class XmlSwapService < BaseService
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

      units      = Array(property['ILS_Unit'])
      floorplans = Array(property['Floorplan'])

      save_xml_floorplans(floorplans, property_id)
      save_xml_units(units, property_id)
    end

    rename_provider
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
    domain = domain.to_s.strip

    properties = Array(response.dig('PhysicalProperty', 'Property'))

    properties.find do |p|
      ids = p.dig('PropertyID', 'Identification')
      next false unless ids

      ids['SecondaryID'].to_s.strip == domain ||
        ids['PrimaryID'].to_s.strip == domain
    end
  end

  # ------------------------------------------------------------------
  # Units (SWAP logic)
  # ------------------------------------------------------------------

  def save_xml_units(units, property_id)
    units.each { |u| upsert_swap_unit(u, property_id) }
  end

  def upsert_swap_unit(u, property_id)
    vacate_date = parse_vacate_date(u['Availability'])
    marketing   = get_marketing_name(u)
    building    = normalize_building(u['BuildingID'])

    scope = Unit.where(community_id: credentials.community_id, marketing_name: marketing)
    scope = scope.where(building: building) if scope.count > 1

    unit = scope.first

    if unit
      update_existing_swap_unit(unit, u, property_id, vacate_date, building)
    else
      replace_or_create_swap_unit(u, property_id, vacate_date, building)
    end
  rescue StandardError
    nil
  end

  def update_existing_swap_unit(unit, u, property_id, vacate_date, building)
    unit.assign_attributes(
      provider: 'xml_new',
      property_id: property_id,
      provider_unit_id: u['Id'],
      unit_type: u.dig('Unit', 'Information', 'UnitType'),
      floorplan_id: u['FloorplanID'],
      effective_rent: effective_rent(u),
      floor: u['EntryFloor'],
      availability: u.dig('Availability', 'VacancyClass'),
      available: u.dig('Availability', 'VacancyClass') == 'Unoccupied',
      availability_url: u.dig('Availability', 'UnitAvailabilityURL'),
      square_feet: u.dig('Unit', 'Information', 'MinSquareFeet'),
      available_date: vacate_date,
      building: building,
      manually_updated: false
    )

    unit.save(validate: false)
  end

  def replace_or_create_swap_unit(u, property_id, vacate_date, building)
    Unit.find_by(
      community_id: credentials.community_id,
      provider_unit_id: u['Id']
    )&.destroy

    Unit.create(
      community_id: credentials.community_id,
      provider: 'xml_new',
      provider_unit_id: u['Id'],
      property_id: property_id,
      unit_type: u.dig('Unit', 'Information', 'UnitType'),
      marketing_name: get_marketing_name(u),
      floorplan_id: u['FloorplanID'],
      effective_rent: effective_rent(u),
      floor: u['EntryFloor'],
      availability: u.dig('Availability', 'VacancyClass'),
      available: u.dig('Availability', 'VacancyClass') == 'Unoccupied',
      availability_url: u.dig('Availability', 'UnitAvailabilityURL'),
      square_feet: u.dig('Unit', 'Information', 'MinSquareFeet'),
      available_date: vacate_date,
      building: building,
      manually_updated: false,
      validate: false
    )
  end

  def effective_rent(u)
    u.dig('EffectiveRent', 'Min') ||
      u.dig('EffectiveRent', 'Avg') ||
      1.0
  end

  def parse_vacate_date(availability)
    date = availability['VacateDate']
    return unless date

    Date.parse("#{date['Year']}-#{date['Month']}-#{date['Day']}")
  rescue StandardError
    nil
  end

  # ------------------------------------------------------------------
  # Floorplans (SWAP logic)
  # ------------------------------------------------------------------

  def save_xml_floorplans(floorplans, property_id)
    floorplans.each { |f| upsert_swap_floorplan(f, property_id) }
  end

  def upsert_swap_floorplan(f, property_id)
    scope = Floorplan.where(
      community_id: credentials.community_id,
      name: f['Name']
    )

    scope = scope.where(
      bedrooms: f.dig('Room', 0, 'Count'),
      bathrooms: f.dig('Room', 1, 'Count'),
      square_feet: f.dig('SquareFeet', 'Min')
    ) if scope.count > 1

    floorplan = scope.first

    if floorplan
      update_existing_floorplan(floorplan, f, property_id)
    else
      replace_or_create_floorplan(f, property_id)
    end
  end

  def update_existing_floorplan(fp, f, property_id)
    fp.assign_attributes(
      provider: 'xml_new',
      property_id: property_id,
      provider_floorplan_id: f['Id'],
      unit_count: f['UnitCount'],
      units_available: f['DisplayedUnitsAvailable'],
      availability_url: f['FloorplanAvailabilityURL'],
      bedrooms: f.dig('Room', 0, 'Count'),
      bathrooms: f.dig('Room', 1, 'Count'),
      square_feet: square_feet(f),
      market_rent: market_rent(f)
    )

    fp.save(validate: false)
  end

  def replace_or_create_floorplan(f, property_id)
    Floorplan.find_by(
      community_id: credentials.community_id,
      provider_floorplan_id: f['Id']
    )&.destroy

    Floorplan.create(
      community_id: credentials.community_id,
      provider: 'xml_new',
      property_id: property_id,
      name: f['Name'],
      provider_floorplan_id: f['Id'],
      unit_count: f['UnitCount'],
      units_available: f['DisplayedUnitsAvailable'],
      availability_url: f['FloorplanAvailabilityURL'],
      bedrooms: f.dig('Room', 0, 'Count'),
      bathrooms: f.dig('Room', 1, 'Count'),
      square_feet: square_feet(f),
      market_rent: market_rent(f),
      validate: false
    )
  end

  def square_feet(f)
    f.dig('SquareFeet', 'Min').to_f.positive? ?
      f.dig('SquareFeet', 'Min') :
      f.dig('SquareFeet', 'Max')
  end

  def market_rent(f)
    f.dig('MarketRent', 'Min').to_f.positive? ?
      f.dig('MarketRent', 'Min') :
      f.dig('MarketRent', 'Max')
  end

  # ------------------------------------------------------------------
  # Provider rename / cleanup
  # ------------------------------------------------------------------

  def rename_provider
    Floorplan.where(community_id: credentials.community_id)
             .where.not(provider: 'xml_new')
             .delete_all

    Unit.where(community_id: credentials.community_id)
        .where.not(provider: %w[xml_new manually])
        .delete_all

    Unit.where(community_id: credentials.community_id, provider: 'xml_new')
        .update_all(provider: 'xml')

    Floorplan.where(community_id: credentials.community_id, provider: 'xml_new')
             .update_all(provider: 'xml')
  end

  # ------------------------------------------------------------------
  # Utils
  # ------------------------------------------------------------------

  def file_url
    filename = credentials.xml_filename
    xml_file = filename.end_with?('.xml') ? filename : "#{filename}.xml"
    "http://pynwheel.com/swoop/datafeeds/#{xml_file}"
  end

  def normalize_building(value)
    value.present? ? value.gsub('Building ', '') : nil
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