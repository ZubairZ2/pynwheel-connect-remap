module Connect
  # Rows for the Connect "Property Inventory" Units tab: the units
  # UnitsController#index resolves through UnitFilterQuery, carrying what the
  # legacy units grid and unit form show for each one.
  class UnitSerializer
    def self.collection(units, community, floorplans_by_provider_id:, base_url:)
      units = units.to_a
      interiors = Amenity.where(amenityable_type: 'Unit', amenityable_id: units.map(&:id))
                         .order(:sort, :id)
                         .group_by(&:amenityable_id)
      # The grid labels every row with the provider id on Yardi properties.
      label_by_provider_id = community.data_provider.to_s == 'yardi'

      units.map do |unit|
        new(
          unit,
          floorplan: unit.floorplan_id.present? ? floorplans_by_provider_id[unit.floorplan_id] : nil,
          interiors: interiors[unit.id] || [],
          label_by_provider_id: label_by_provider_id,
          base_url: base_url
        ).as_json
      end
    end

    def initialize(unit, floorplan:, interiors:, label_by_provider_id:, base_url:)
      @unit = unit
      @floorplan = floorplan
      @interiors = interiors
      @label_by_provider_id = label_by_provider_id
      @base_url = base_url
    end

    def as_json(*)
      {
        id: unit.id,
        marketing_name: unit.marketing_name,
        display_name: display_name,
        provider_unit_id: unit.provider_unit_id.presence,
        provider: unit.provider.presence,
        unit_type: unit.unit_type.presence,
        floorplan_id: floorplan&.id,
        floorplan_provider_id: unit.floorplan_id.presence,
        price: unit.effective_rent,
        market_rent: unit.market_rent,
        square_feet: unit.square_feet,
        available: unit.available.present?,
        available_date: unit.available_date,
        availability: unit.availability.presence,
        sold: unit.sold.present?,
        unit_status: unit.unit_status.presence,
        building: unit.building.presence,
        floor: unit.floor,
        floorplate_id: unit.floorplate_id,
        plotted: unit.plotted_on_map?,
        visible: unit.visible.present?,
        show_on_map: unit.show_on_map.present?,
        model_unit: unit.modal_unit.present?,
        manual_override: unit.manual_override.present?,
        # Per-field "set by hand" markers (Unit::FEED_OVERRIDE_FLAGS): the feed
        # leaves a field alone while its marker is set.
        flags: Unit::FEED_OVERRIDE_FLAGS.transform_values { |flag| unit.public_send(flag[:column]).present? },
        # A door's provider wins over the unit's own column, as in the grid.
        lock_provider: unit.door&.lock_provider.presence || unit.lock_provider.presence,
        door_id: unit.door&.id,
        tour_order: unit.tour_visiting_order_number,
        image: UploadUrl.file(unit, :image, base_url),
        secondary_image: UploadUrl.file(unit, :secondary_image, base_url),
        interior_images: interiors.map { |amenity| FloorplanSerializer.interior(amenity, base_url) },
        buttons: FloorplanSerializer.buttons(unit),
        additional_fee: unit.additional_fee.presence,
        description_title: unit.description_title.presence,
        description: unit.description.presence,
        stop_description: unit.stop_description.presence,
        updated_at: unit.updated_at
      }
    end

    private

      attr_reader :unit, :floorplan, :interiors, :label_by_provider_id, :base_url

      # Unit#unit_market ("{building}-{name}"), without its failure on a unit
      # that has a building but no name.
      def display_name
        return unit.provider_unit_id.presence || unit.marketing_name if label_by_provider_id

        [unit.building.presence, unit.marketing_name.presence].compact.join('-').presence
      end
  end
end
