# frozen_string_literal: true

module TourApi
  # Build Your Tour: the real selectable destinations of a property.
  #
  # Membership is `TourStops::Membership.in_list?` read in bulk: a visible
  # `tour_stops` row of the property's main tour (`tours.tour_user_id IS
  # NULL`, latest) for the unit or amenity, and for an amenity also its own
  # "Show in Stops List" column (`breezway_lock_visible`). Duplicate rows for
  # one record collapse to one stop (the lowest `tour_stops.id`); nothing is
  # inferred from plotting. Each stop carries its map node, location and
  # whether a route can reach it, from the built graph.
  module Stops
    VISIBLE = 'tour_stops.display_stop IS DISTINCT FROM FALSE'

    module_function

    def list(community, built)
      graph = built.graph
      tour_id = community.community_tour&.id
      amenities = []
      units = []
      if tour_id
        amenity_rows(community, tour_id).each { |ts, amenity| amenities << amenity_stop(graph, ts, amenity) }
        unit_rows(community, tour_id).each { |ts, unit, floorplan| units << unit_stop(graph, ts, unit, floorplan) }
      end
      # Tour order: the rule the routes use (building order, floor, Tour Setup sort, id).
      building_index = graph.buildings.each_with_index.to_h
      order = ->(stop) { [building_index[stop[:building] || ''] || 0, stop[:floor] || 0, stop[:sort] || (1 << 30), stop[:tour_stop_id]] }
      amenities.sort_by!(&order)
      units.sort_by!(&order)
      start = graph.nodes.keys.find { |k| k.start_with?('tour_start:') }
      {
        success: true,
        property_id: community.id,
        graph_version: built.version,
        tour_id: tour_id,
        start_node: start,
        groups: [{ key: 'amenities', label: 'Amenities', stops: amenities }, { key: 'floorplans', label: 'Floorplans', stops: units }],
        total: amenities.size + units.size
      }
    end

    def selectable_ids(community, built)
      list(community, built)[:groups].flat_map { |group| group[:stops].map { |stop| stop[:id] } }.to_set
    end

    # [tour_stop, unit, floorplan] per unit on the list: the lowest visible
    # stop row per unit, the unit of this property, its floor plan by
    # provider id (the CMS's own join).
    def unit_rows(community, tour_id)
      first_stop = {}
      TourStop.where(tour_id: tour_id, stop_type: 'unit').where(VISIBLE).order(:id).each { |ts| first_stop[ts.stop_id] ||= ts }
      units = Unit.where(community_id: community.id, id: first_stop.keys).index_by(&:id)
      provider_ids = units.values.map(&:floorplan_id).compact.uniq
      floorplans = if provider_ids.empty?
                     {}
                   else
                     Floorplan.where(community_id: community.id, provider_floorplan_id: provider_ids).order(:id).group_by(&:provider_floorplan_id).transform_values(&:first)
                   end
      first_stop.filter_map do |unit_id, ts|
        unit = units[unit_id]
        unit && [ts, unit, floorplans[unit.floorplan_id]]
      end
    end

    def amenity_rows(community, tour_id)
      first_stop = {}
      TourStop.where(tour_id: tour_id, stop_type: 'amenity').where(VISIBLE).order(:id).each { |ts| first_stop[ts.stop_id] ||= ts }
      amenities = Amenity.where(community_id: community.id, id: first_stop.keys).where('amenities.breezway_lock_visible IS DISTINCT FROM FALSE').index_by(&:id)
      first_stop.filter_map { |amenity_id, ts| amenities[amenity_id] && [ts, amenities[amenity_id]] }
    end

    # [level_id, location, routable] of the stop's graph node; a stop that is
    # not plotted has none. Routable: joined to a path (explicit or nearest
    # link) with at least one edge on some floor copy.
    def node_facts(graph, key)
      node = graph.nodes[key]
      return [nil, nil, false] unless node

      routable = %w[explicit nearest].include?(node.link) && graph.copy_nodes.each_value.any? { |copy| copy[:node].key == key && copy[:linked] }
      [node.level_key, { x: node.x, y: node.y }, routable]
    end

    def amenity_stop(graph, ts, amenity)
      key = "amenity:#{amenity.id}"
      level_id, location, routable = node_facts(graph, key)
      {
        id: key, type: 'amenity', record_id: amenity.id, tour_stop_id: ts.id,
        name: amenity.name.presence || ts.name.presence || "Amenity #{amenity.id}",
        description: Text.strip_html(amenity.description), instruction: Text.strip_html(amenity.directional_text),
        building: Text.presence(amenity.building), floor: amenity.floor, level_id: level_id,
        floorplate_id: amenity.amenityable_type == 'Floorplate' ? amenity.amenityable_id : nil,
        location: location, map_node_id: level_id ? key : nil, routable: routable, sort: ts.sort, duration_minutes: ts.duration_minutes,
        unit: nil,
        amenity: { amenity_type: Text.presence(amenity.amenity_type), video_url: Text.presence(amenity.video_link),
                   video_button_label: Text.presence(amenity.video_link_button_label) }
      }
    end

    def unit_stop(graph, ts, unit, floorplan)
      key = "unit:#{unit.id}"
      level_id, location, routable = node_facts(graph, key)
      square_feet = if Text.truthy?(unit.square_feet)
                      Text.to_f(unit.square_feet)
                    elsif floorplan && Text.truthy?(floorplan.square_feet)
                      Text.to_f(floorplan.square_feet)
                    end
      {
        id: key, type: 'unit', record_id: unit.id, tour_stop_id: ts.id,
        name: unit.marketing_name.presence || ts.name.presence || "Unit #{unit.id}",
        description: Text.strip_html(unit.description), instruction: Text.strip_html(unit.stop_description),
        building: Text.presence(unit.building), floor: unit.floor, level_id: level_id, floorplate_id: unit.floorplate_id,
        location: location, map_node_id: level_id ? key : nil, routable: routable, sort: ts.sort, duration_minutes: ts.duration_minutes,
        unit: {
          bedrooms: floorplan && !floorplan.bedrooms.nil? && floorplan.bedrooms != '' ? Text.to_f(floorplan.bedrooms) : nil,
          bathrooms: floorplan && !floorplan.bathrooms.nil? ? Text.to_f(floorplan.bathrooms) : nil,
          square_feet: square_feet,
          rent: rent_of(unit),
          available: unit.available,
          model: unit.modal_unit ? true : false,
          floorplan_name: floorplan ? Text.presence(floorplan.name) : nil
        },
        amenity: nil
      }
    end

    # `effective_rent`, else `market_rent`; nil when not published (<= 0).
    def rent_of(unit)
      [unit.effective_rent, unit.market_rent].each do |value|
        return Text.to_f(value) if !value.nil? && Text.to_f(value).positive?
      end
      nil
    end
  end
end
