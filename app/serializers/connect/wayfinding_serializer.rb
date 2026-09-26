module Connect
  # The map data behind the legacy Auto Wayfinding page
  # (AutomatePlottingController#index and its `_floorplate_map` / `_sitemap`
  # partials), for the Connect "Map & Plotting" screen.
  #
  # Every coordinate is sent exactly as stored: natural pixels of the floor
  # image the record is plotted on (a floorplate's `image`, or the sitemap's),
  # never a percentage. The floorplates themselves, and the unit and amenity
  # pins, come from the inventory listings (`floorplates.json`, `units.json`,
  # `amenities.json`); this adds what only the wayfinding page reads:
  #
  #   - hallways: the pathway graph. One node per row, plotted on a Floorplate
  #     or the Sitemap (`parent`); `next_points` are the ids it connects to,
  #     stored one way and walked both ways by the algorithm; `selected` is
  #     the node the legacy editor chains the next click from.
  #   - elevators: a vertical connection. One row, one x/y, shown on every
  #     floor in `floorplate_covering_range`.
  #   - building starting points: the designated entry/exit per building.
  #   - the tour's own starting point (`tours.x_plot` / `y_plot`) and the
  #     visible tour stops in their sort order, which is what the algorithm
  #     routes through.
  #   - doors: unit and amenity doors (the algorithm targets a door when the
  #     stop has one) and access points.
  #   - the OCR text boxes the legacy auto-plot matched unit names against
  #     (`map_ocr_data`, written by Textract), where a floorplate has them.
  class WayfindingSerializer
    def initialize(community, base_url:)
      @community = community
      @base_url = base_url
    end

    def as_json(*)
      {
        settings: settings,
        buildings: buildings,
        floor_to_floorplate: floor_to_floorplate,
        hallways: hallways,
        elevators: elevators,
        building_starting_points: building_starting_points,
        tour: tour_json,
        tour_stops: tour_stops,
        doors: doors,
        bedroom_marker_colors: bedroom_marker_colors,
        ocr: ocr
      }
    end

    private

      attr_reader :community, :base_url

      def tour
        return @tour if defined?(@tour)

        @tour = community.community_tour
      end

      def floorplates
        @floorplates ||= community.floorplates.to_a
      end

      def sitemap
        return @sitemap if defined?(@sitemap)

        @sitemap = community.sitemap
      end

      def settings
        design = community.design
        {
          auto_wayfinding: community.auto_wayfinding.present?,
          self_tour: community.self_tour.present?,
          is_sitemap: community.is_sitemap.present?,
          enable_svg_mode: community.enable_svg_mode.present?,
          default_map_floor: community.default_map_floor,
          # The legacy marker: `design.property_map_size_integer` sizes the pin
          # (and the offsets `_decide_styling` derives from it).
          marker_size: design&.property_map_size_integer,
          available_units_color: community.available_units_color.presence,
          model_units_color: community.model_units_color.presence,
          amenities_color: community.amenities_color.presence
        }
      end

      # Community#fetch_building_list: the distinct unit and amenity buildings,
      # in the tour's building order.
      def buildings
        community.fetch_building_list(tour&.building_order)
      rescue StandardError
        []
      end

      # {floor => floorplate id}, as the legacy page keys its maps. A range the
      # model cannot read yields no floors rather than an error.
      def floor_to_floorplate
        floorplates.each_with_object({}) do |plate, map|
          floors_of(plate).each { |floor| map[floor] = plate.id }
        end
      end

      def floors_of(plate)
        plate.range.present? ? plate.floors : []
      rescue StandardError
        []
      end

      def hallways
        scope = Hallway.where(parent_type: 'Floorplate', parent_id: floorplates.map(&:id))
        scope = scope.or(Hallway.where(parent_type: 'Sitemap', parent_id: sitemap.id)) if sitemap
        scope.order(:id).map do |hallway|
          {
            id: hallway.id,
            x_plot: hallway.x_plot,
            y_plot: hallway.y_plot,
            next_points: Array(hallway.next_points),
            selected: hallway.selected.present?,
            parent_type: hallway.parent_type,
            parent_id: hallway.parent_id
          }
        end
      end

      def elevators
        community.elevators.order(:id).map do |elevator|
          {
            id: elevator.id,
            name: elevator.name,
            x_plot: elevator.x_plot,
            y_plot: elevator.y_plot,
            floorplate_id: elevator.floorplate_id,
            sitemap_id: elevator.sitemap_id,
            covering_range: elevator.floorplate_covering_range.presence,
            floors: elevator_floors(elevator),
            building: elevator.building.presence,
            directional_text: elevator.directional_text.presence,
            duplicate_of: elevator.duplicate_of,
            lock_provider: elevator.lock_provider.presence,
            image: UploadUrl.upload(elevator, :image, base_url),
            tour_stop: stop_state('elevator', elevator.id)
          }
        end
      end

      def elevator_floors(elevator)
        elevator.floorplate_covering_range.present? ? elevator.floors : []
      rescue StandardError
        []
      end

      def building_starting_points
        BuildingStartingPoint.where(community_id: community.id).order(:id).map do |point|
          {
            id: point.id,
            name: point.name,
            building: point.building.presence,
            floor: point.floor,
            x_plot: point.x_plot,
            y_plot: point.y_plot,
            status: point.status.presence,
            directional_text: point.directional_text.presence,
            lock_provider: point.lock_provider.presence,
            tour_stop: stop_state('building_starting_point', point.id)
          }
        end
      end

      def tour_json
        return nil unless tour

        {
          id: tour.id,
          name: tour.name.presence,
          x_plot: tour.x_plot,
          y_plot: tour.y_plot,
          starting_floor: tour.starting_floor,
          building: tour.building.presence,
          building_order: Array(tour.building_order),
          dotted_line_color: tour.dotted_line_color.presence,
          enable_auto_zoom: tour.enable_auto_zoom.present?
        }
      end

      def all_tour_stops
        @all_tour_stops ||= tour ? tour.tour_stops.order(:sort, :id).to_a : []
      end

      def tour_stops
        all_tour_stops.map do |stop|
          {
            id: stop.id,
            stop_type: stop.stop_type,
            stop_id: stop.stop_id,
            name: stop.name.presence,
            sort: stop.sort,
            display_stop: stop.display_stop != false,
            latitude: stop.latitude&.to_f,
            longitude: stop.longitude&.to_f
          }
        end
      end

      # nil when the record is not a tour stop; otherwise whether the stop is
      # shown (`display_stop`), which is what the algorithm routes through.
      def stop_state(stop_type, stop_id)
        stop = all_tour_stops.find { |row| row.stop_type == stop_type && row.stop_id == stop_id }
        stop ? { id: stop.id, sort: stop.sort, visible: stop.display_stop != false } : nil
      end

      def doors
        community.doors.order(:id).map do |door|
          {
            id: door.id,
            name: door.name.presence,
            floor: door.floor,
            x_plot: door.x_plot,
            y_plot: door.y_plot,
            attached_with_type: door.attached_with_type,
            attached_with_id: door.attached_with_id,
            sort: door.sort,
            lock_provider: door.lock_provider.presence
          }
        end
      end

      def bedroom_marker_colors
        BedroomMarkerColor.where(community_id: community.id).order(:bedroom).map do |row|
          {
            bedroom: row.bedroom,
            available_units_color: row.available_units_color.presence,
            available_units_opacity: row.available_units_opacity&.to_f,
            model_units_color: row.model_units_color.presence,
            model_units_opacity: row.model_units_opacity&.to_f
          }
        end
      end

      # Textract text boxes per map ("Floorplate:507" / "Sitemap:12"), in the
      # normalised (0..1) `left` / `top` / `width` / `height` the CMS stores.
      # Only boxes that carry text are sent; the legacy auto-plot matched a
      # unit when `unit.marketing_name.include?(text)` for text longer than 2
      # characters, and placed it at `left * width`, `top * height`.
      def ocr
        maps = floorplates.map { |plate| ['Floorplate', plate] }
        maps << ['Sitemap', sitemap] if sitemap

        maps.each_with_object({}) do |(type, record), out|
          boxes = record.map_ocr_data
          next unless boxes.is_a?(Array) && boxes.any?

          rows = boxes.filter_map do |box|
            next unless box.is_a?(Hash) && box['text'].present?

            {
              text: box['text'],
              left: box['left'].to_f,
              top: box['top'].to_f,
              width: box['width'].to_f,
              height: box['height'].to_f
            }
          end
          out["#{type}:#{record.id}"] = rows if rows.any?
        end
      end
  end
end
