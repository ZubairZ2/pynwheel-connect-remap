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
  #     floor in `floorplate_covering_range`; with the elevator form's
  #     description, gallery photos and Latch elevator banks, which the
  #     Connect Tour Setup "Elevators & Locks" tab lists.
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
        ocr: ocr,
        # Wayfinding persistence (October 2026): the per-edge rows, the stop →
        # hallway links, the additional stops, the levels' versions and frames,
        # and how many user deletions each level remembers.
        hallway_edges: hallway_edges,
        hallway_attachments: hallway_attachments,
        wayfinding_stops: wayfinding_stops,
        levels: levels,
        suppressions: suppressions
      }
    end

    # The compare-and-swap versions a Connect save sends back: one per level
    # ("floorplate:507" / "sitemap:12") and one for the main tour.
    def self.versions(community)
      out = {}
      community.floorplates.pluck(:id, :wayfinding_version).each { |id, v| out["floorplate:#{id}"] = v }
      Sitemap.where(community_id: community.id).pluck(:id, :wayfinding_version).each { |id, v| out["sitemap:#{id}"] = v }
      out['tour'] = community.community_tour&.tour_setup_version
      out
    end

    # The Tour Setup screen's part of the payload, after a save.
    def self.tour_setup_json(community)
      serializer = new(community, base_url: nil)
      { tour: serializer.send(:tour_json), tour_stops: serializer.send(:tour_stops) }
    end

    def self.hallway_row(hallway)
      {
        id: hallway.id,
        x_plot: hallway.x_plot,
        y_plot: hallway.y_plot,
        next_points: Array(hallway.next_points),
        selected: hallway.selected.present?,
        parent_type: hallway.parent_type,
        parent_id: hallway.parent_id,
        source: hallway.source,
        review_status: hallway.review_status,
        confidence: hallway.confidence,
        space: hallway.space,
        detection_run_id: hallway.detection_run_id,
        confirmed_at: hallway.confirmed_at
      }
    end

    def self.edge_row(edge)
      {
        id: edge.id,
        from: edge.from_hallway_id,
        to: edge.to_hallway_id,
        parent_type: edge.parent_type,
        parent_id: edge.parent_id,
        kind: edge.kind,
        points: Array(edge.path_points),
        review_status: edge.review_status,
        auto_generated: edge.auto_generated,
        detection_run_id: edge.detection_run_id,
        space: edge.space
      }
    end

    def self.attachment_row(attachment)
      {
        id: attachment.id,
        attachable_type: attachment.attachable_type,
        attachable_id: attachment.attachable_id,
        parent_type: attachment.parent_type,
        parent_id: attachment.parent_id,
        hallway_id: attachment.hallway_id,
        mode: attachment.mode,
        anchor_x: attachment.anchor_x,
        anchor_y: attachment.anchor_y,
        space: attachment.space
      }
    end

    def self.stop_row(stop)
      {
        id: stop.id,
        kind: stop.kind,
        name: stop.name,
        map_type: stop.map_type,
        map_id: stop.map_id,
        building: stop.building.presence,
        floor: stop.floor,
        x_plot: stop.x_plot,
        y_plot: stop.y_plot,
        space: stop.space,
        accessible: stop.accessible,
        lock_provider: stop.lock_provider.presence,
        note: stop.note.presence,
        radius_px: stop.radius_px,
        hallway_id: stop.hallway_id,
        status: stop.status,
        source: stop.source
      }
    end

    def self.level_row(record)
      kind = record.class.base_class.name
      {
        kind: kind.underscore,
        id: record.id,
        wayfinding_version: record.wayfinding_version,
        svg_to_image_transform: record.svg_to_image_transform,
        scale_ft_per_px: record.scale_ft_per_px&.to_f,
        wayfinding_space: Hallway.where(parent_type: kind, parent_id: record.id, space: 'svg').exists? ? 'svg' : 'raster'
      }
    end

    private

      attr_reader :community, :base_url

      def level_records
        @level_records ||= floorplates + [sitemap].compact
      end

      def level_scope(klass)
        plates = floorplates.map(&:id)
        scope = klass.where(parent_type: 'Floorplate', parent_id: plates)
        scope = scope.or(klass.where(parent_type: 'Sitemap', parent_id: sitemap.id)) if sitemap
        scope
      end

      def hallway_edges
        level_scope(HallwayEdge).order(:id).map { |edge| self.class.edge_row(edge) }
      end

      def hallway_attachments
        level_scope(HallwayAttachment).order(:id).map { |row| self.class.attachment_row(row) }
      end

      def wayfinding_stops
        community.wayfinding_stops.active.order(:id).map { |stop| self.class.stop_row(stop) }
      end

      def levels
        level_records.map { |record| self.class.level_row(record) }
      end

      def suppressions
        level_scope(HallwaySuppression).group(:parent_type, :parent_id).count.each_with_object({}) do |((type, id), count), out|
          out["#{type}:#{id}"] = count
        end
      end

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
          # The Self-Guided Tour state every Connect screen shares (Connect::ProductState).
          self_tour: ProductState.tour?(community),
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
        scope.order(:id).map { |hallway| self.class.hallway_row(hallway) }
      end

      def elevators
        rows = community.elevators.order(:id).to_a
        # The Tour Setup "Elevators & Locks" tab also shows what the legacy
        # elevator form holds: the gallery (`elevator_galleries`, the photos
        # under the form) and the Latch elevator banks (`elevator_banks`: the
        # per-cab name, position and lock). One query each for the property.
        galleries = ElevatorGallery.where(elevator_id: rows.map(&:id)).order(:id).group_by(&:elevator_id)
        banks = ElevatorBank.where(elevator_id: rows.map(&:id)).order(:created_at, :id).group_by(&:elevator_id)

        rows.map do |elevator|
          {
            id: elevator.id,
            name: elevator.name,
            description: elevator.description.presence,
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
            kind: elevator.kind,
            accessible: elevator.accessible != false,
            floor_positions: elevator.floor_positions.is_a?(Hash) ? elevator.floor_positions : {},
            image: UploadUrl.upload(elevator, :image, base_url, bucket: bucket),
            gallery: (galleries[elevator.id] || []).map do |photo|
              { id: photo.id, name: photo.name.presence, url: UploadUrl.upload(photo, :image, base_url, bucket: bucket) }
            end,
            banks: (banks[elevator.id] || []).map do |bank|
              {
                id: bank.id,
                name: bank.name.presence,
                position: bank.position.presence,
                lock_type: bank.lock_type.presence,
                lock_name: bank.lock_name.presence
              }
            end,
            tour_stop: stop_state('elevator', elevator.id)
          }
        end
      end

      # Where the property's uploads live on S3, for an elevator image or
      # gallery photo whose file is not on this machine (UploadUrl).
      def bucket
        @bucket ||= UploadUrl.bucket_hint(community)
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
          enable_auto_zoom: tour.enable_auto_zoom.present?,
          tour_setup_version: tour.tour_setup_version
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
            longitude: stop.longitude&.to_f,
            duration_minutes: stop.duration_minutes
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
            lock_provider: door.lock_provider.presence,
            note: door.note.presence
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
