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
  # whether a route can reach it, from the built graph, and its smart lock
  # (`lock`, see TourApi::Locks) when the CMS assigned one.
  #
  # October 21, 2026 (the Start Tour experience): each stop also carries what
  # the app's Unit / Amenity detail shows from the CMS's own inventory data -
  # the unit's availability date and type, its lease-term pricing (the kiosk's
  # matrix rule, `Unit#get_lease_term_pricing_matrix`), the floor plan's
  # deposit and the property's additional-fee text, and the CMS-managed
  # media (`media`: the main image, the floor plan image, the gallery photos,
  # the virtual-tour link). Nothing is invented: a field the CMS does not hold
  # is null, and the URLs are the ones Connect's inventory resolves
  # (`Connect::UploadUrl`), which need the request's `base_url` for a
  # development upload.
  module Stops
    VISIBLE = 'tour_stops.display_stop IS DISTINCT FROM FALSE'

    module_function

    def list(community, built, base_url: nil)
      graph = built.graph
      tour_id = community.community_tour&.id
      amenities = []
      units = []
      if tour_id
        locks = Locks.index(community)
        media = Media.new(community, base_url)
        amenity_rows(community, tour_id).each { |ts, amenity| amenities << amenity_stop(graph, ts, amenity, locks, media) }
        unit_rows(community, tour_id).each { |ts, unit, floorplan| units << unit_stop(graph, ts, unit, floorplan, locks, media) }
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
      units = Unit.where(community_id: community.id, id: first_stop.keys).includes(:door).index_by(&:id)
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

    def amenity_stop(graph, ts, amenity, locks = nil, media = nil)
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
                   video_button_label: Text.presence(amenity.video_link_button_label) },
        lock: locks ? Locks.describe(locks, amenity) : nil,
        media: media ? media.amenity(amenity) : nil
      }
    end

    def unit_stop(graph, ts, unit, floorplan, locks = nil, media = nil)
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
          floorplan_name: floorplan ? Text.presence(floorplan.name) : nil,
          # The detail screen's facts (October 21, 2026): from the CMS's columns, null when it holds none.
          unit_type: Text.presence(unit.unit_type),
          available_date: unit.available_date&.iso8601,
          availability: Text.presence(unit.availability),
          lease_terms: lease_terms_of(unit),
          deposit: floorplan && Text.truthy?(floorplan.deposit) ? Text.to_f(floorplan.deposit) : nil,
          additional_fee: Text.strip_html(media ? media.community.get_additional_fees(unit) : nil),
          virtual_tour_url: Text.presence(unit.virtual_tour_url) || (floorplan ? Text.presence(floorplan.virtual_tour_url) : nil)
        },
        amenity: nil,
        lock: locks ? Locks.describe(locks, unit) : nil,
        media: media ? media.unit(unit, floorplan) : nil
      }
    end

    # The unit's rent per lease term, by the rule the kiosk's pricing matrix
    # follows (`Unit#get_lease_term_pricing_matrix`): `lease_pricing` holds
    # `term:rent:...;` entries, shown only while the property displays
    # pricing options, and only the entries with a rent. Sorted by term.
    def lease_terms_of(unit)
      return [] unless unit.lease_pricing.present? && unit.community&.display_pricing_options

      unit.lease_pricing.to_s.split(';').filter_map do |entry|
        term, rent = entry.split(':')
        next unless term.to_i.positive? && rent.to_i.positive?

        { months: term.to_i, rent: rent.to_f }
      end.sort_by { |row| row[:months] }
    rescue StandardError
      []
    end

    # The CMS-managed images of the stops, resolved as Connect's inventory
    # resolves them (the standard S3 URL first, else the stored upload), with
    # the gallery rows read once per list.
    class Media
      attr_reader :community

      def initialize(community, base_url)
        @community = community
        @base_url = base_url
        @bucket = Connect::UploadUrl.bucket_hint(community)
      end

      def amenity(amenity)
        photos = galleries[amenity.id] || []
        {
          image: Connect::UploadUrl.image(amenity, @base_url, bucket: @bucket),
          floorplan_image: nil,
          photos: photos.filter_map { |g| url = Connect::UploadUrl.upload(g, :image, @base_url, bucket: Connect::UploadUrl.bucket_of(amenity, @bucket)); url && { id: g.id, name: Text.presence(g.name), url: url } },
          virtual_tour_url: nil
        }
      end

      def unit(unit, floorplan)
        {
          image: Connect::UploadUrl.image(unit, @base_url, bucket: @bucket),
          floorplan_image: floorplan ? Connect::UploadUrl.image(floorplan, @base_url, bucket: @bucket) : nil,
          photos: (interiors[unit.id] || []).filter_map { |a| url = Connect::UploadUrl.image(a, @base_url, bucket: @bucket); url && { id: a.id, name: Text.presence(a.name), url: url } },
          virtual_tour_url: Text.presence(unit.virtual_tour_url) || (floorplan ? Text.presence(floorplan.virtual_tour_url) : nil)
        }
      end

      private

        def galleries
          @galleries ||= AmenityGallery.where(amenity_id: Amenity.where(community_id: @community.id).select(:id)).order(:sort, :id).group_by(&:amenity_id)
        end

        # A unit's "interior images" are the amenities attached to it, as the Connect inventory lists them.
        def interiors
          @interiors ||= Amenity.where(community_id: @community.id, amenityable_type: 'Unit').order(:sort, :id).group_by(&:amenityable_id)
        end
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
