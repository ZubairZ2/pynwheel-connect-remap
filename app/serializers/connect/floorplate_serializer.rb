module Connect
  # Rows for the Connect "Property Inventory" Floorplates tab: the floorplates
  # FloorplatesController#index lists, plus the unit and amenity counts the
  # legacy plotting pages work from.
  #
  # Counts follow the models' own definitions:
  #   - a floorplate's units are Floorplate#fetch_units: visible units whose
  #     floor is one of Floorplate#floors;
  #   - one of those is plotted on it when the unit's `floorplate_id` points
  #     here and it has a position (Unit#plotted_on_map?: x/y or an SVG pointer);
  #   - its amenities are the ones plotted onto it (`amenityable` = Floorplate).
  class FloorplateSerializer
    UnitPlacement = Struct.new(:floor, :floorplate_id, :plotted)

    # Both lookups are one query each for the whole property, not per row.
    def self.collection(floorplates, community, base_url:)
      floorplates = floorplates.to_a

      units = community.units.visible_units
                       .pluck(:floor, :floorplate_id, :x_plot, :y_plot, Arel.sql("units.pointer_data->>'x_plot'"))
                       .map { |floor, plate_id, x, y, pointer_x| UnitPlacement.new(floor, plate_id, positioned?(x, y, pointer_x)) }

      amenities = Amenity.where(amenityable_type: 'Floorplate', amenityable_id: floorplates.map(&:id))
                         .pluck(:amenityable_id, :x_plot, :y_plot, Arel.sql("amenities.pointer_data->>'x_plot'"))
                         .group_by(&:first)

      floorplates.map { |floorplate| new(floorplate, units, amenities[floorplate.id] || [], base_url).as_json }
    end

    def self.positioned?(x_plot, y_plot, pointer_x)
      x_plot.to_i.positive? || y_plot.to_i.positive? || pointer_x.present?
    end

    def initialize(floorplate, units, amenities, base_url)
      @floorplate = floorplate
      @units = units
      @amenities = amenities
      @base_url = base_url
    end

    def as_json(*)
      floors = self.floors
      here = units.select { |unit| floors.include?(unit.floor) }
      svg = floorplate.svg_metadata.is_a?(Hash) ? floorplate.svg_metadata : {}

      {
        id: floorplate.id,
        name: floorplate.name,
        number: floorplate.number,
        building: floorplate.building.presence,
        range: floorplate.range,
        floors: floors,
        floor_name: floorplate.floor_name.presence,
        floor_name_added: floorplate.floor_name_added.present?,
        manual_override: floorplate.manual_override.present?,
        name_is_updated: floorplate.name_is_updated.present?,
        building_is_updated: floorplate.building_is_updated.present?,
        image: UploadUrl.file(floorplate, :image, base_url),
        svg: UploadUrl.file(floorplate, :svg_image, base_url),
        width: floorplate.width.to_i.positive? ? floorplate.width.to_i : nil,
        height: floorplate.height.to_i.positive? ? floorplate.height.to_i : nil,
        svg_width: svg['width'].to_i.positive? ? svg['width'].to_i : nil,
        svg_height: svg['height'].to_i.positive? ? svg['height'].to_i : nil,
        unit_count: here.size,
        plotted_unit_count: here.count { |unit| unit.plotted && unit.floorplate_id == floorplate.id },
        amenity_count: amenities.size,
        plotted_amenity_count: amenities.count { |_, x, y, pointer_x| self.class.positioned?(x, y, pointer_x) },
        updated_at: floorplate.updated_at
      }
    end

    private

      attr_reader :floorplate, :units, :amenities, :base_url

      # Floorplate#floors reads the first character of `range`, so a floorplate
      # saved without one has no floors rather than an error.
      def floors
        floorplate.range.present? ? floorplate.floors : []
      end
  end
end
