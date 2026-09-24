module Connect
  # Rows for the Connect "Property Inventory" Floorplans tab: the floor plans
  # FloorplansController#index lists, with what their edit form and the units
  # grid know about them.
  #
  # Units reference a floor plan by `provider_floorplan_id`, not by primary key
  # (Unit#floorplan), so unit counts are grouped on that. A floor plan's
  # "interior images" are the amenities attached to it (`amenityable`).
  class FloorplanSerializer
    # The three buttons of the legacy form (shared/_additional_buttons): the
    # main button, then the two that only appear on the Pynwheel Map.
    BUTTONS = [
      %i[virtual_tour_button_label virtual_tour_url link1_open_new_tab],
      %i[additional_button additional_url link2_open_new_tab],
      %i[scheduler_label scheduler_url link3_open_new_tab]
    ].freeze

    def self.collection(floorplans, community, base_url:)
      floorplans = floorplans.to_a
      unit_counts = community.units.group(:floorplan_id).count
      available_counts = community.units.where(available: true).group(:floorplan_id).count
      interiors = Amenity.where(amenityable_type: 'Floorplan', amenityable_id: floorplans.map(&:id))
                         .order(:sort, :id)
                         .group_by(&:amenityable_id)

      floorplans.map do |floorplan|
        provider_id = floorplan.provider_floorplan_id.presence

        new(
          floorplan,
          unit_count: provider_id ? unit_counts[provider_id].to_i : 0,
          available_count: provider_id ? available_counts[provider_id].to_i : 0,
          interiors: interiors[floorplan.id] || [],
          base_url: base_url
        ).as_json
      end
    end

    def self.buttons(record)
      BUTTONS.map do |label, url, new_tab|
        { label: record.public_send(label).presence, url: record.public_send(url).presence, new_tab: record.public_send(new_tab).present? }
      end
    end

    def self.interior(amenity, base_url)
      { id: amenity.id, name: amenity.name.presence, url: UploadUrl.image(amenity, base_url) }
    end

    def initialize(floorplan, unit_count:, available_count:, interiors:, base_url:)
      @floorplan = floorplan
      @unit_count = unit_count
      @available_count = available_count
      @interiors = interiors
      @base_url = base_url
    end

    def as_json(*)
      {
        id: floorplan.id,
        name: floorplan.name,
        provider: floorplan.provider.presence,
        provider_floorplan_id: floorplan.provider_floorplan_id.presence,
        bedrooms: floorplan.bedrooms.presence,
        bathrooms: floorplan.bathrooms,
        square_feet: floorplan.square_feet,
        market_rent: floorplan.market_rent,
        deposit: floorplan.deposit,
        unit_count: unit_count,
        available_unit_count: available_count,
        availability_status: floorplan.availability_status,
        manual_override: floorplan.manual_override.present?,
        # The legacy grid colours these cells red: set by hand, so the feed
        # stops updating them.
        flags: {
          name: floorplan.name_is_updated.present?,
          square_feet: floorplan.square_feet_is_updated.present?,
          bedrooms: floorplan.bedroom_is_updated.present?,
          bathrooms: floorplan.bathroom_is_updated.present?,
          market_rent: floorplan.market_rent_is_updated.present?
        },
        image: UploadUrl.file(floorplan, :image, base_url),
        secondary_image: UploadUrl.file(floorplan, :secondary_image, base_url),
        interior_images: interiors.map { |amenity| self.class.interior(amenity, base_url) },
        buttons: self.class.buttons(floorplan),
        description_title: floorplan.description_title.presence,
        description: floorplan.description.presence,
        show_description_on_card: floorplan.show_description_on_card.present?,
        updated_at: floorplan.updated_at
      }
    end

    private

      attr_reader :floorplan, :unit_count, :available_count, :interiors, :base_url
  end
end
