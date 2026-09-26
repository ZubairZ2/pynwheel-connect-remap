module Connect
  # Rows for the Connect "Property Inventory" Amenities tab: the property's
  # amenities as AmenitiesController#index lists them (`community.amenities`).
  #
  # An amenity starts unplaced (`amenityable` blank) and is plotted onto a
  # floorplate or the property map (Sitemap), which is also how it becomes a
  # tour stop. Some rows here belong to a floor plan or unit instead: those are
  # interior images that also carry the property's id. The owner is sent as-is
  # so the screen can tell them apart.
  class AmenitySerializer
    def self.collection(amenities, community, base_url:)
      amenities = amenities.to_a
      ids = amenities.map(&:id)
      owner_ids = ->(type) { amenities.select { |a| a.amenityable_type == type }.map(&:amenityable_id).uniq }

      context = {
        galleries: AmenityGallery.where(amenity_id: ids).order(:sort, :id).group_by(&:amenity_id),
        tour_stop_ids: TourStop.where(stop_type: 'amenity', stop_id: ids).distinct.pluck(:stop_id).to_set,
        floorplates: Floorplate.where(id: owner_ids.call('Floorplate')).index_by(&:id),
        floorplans: Floorplan.where(id: owner_ids.call('Floorplan')).pluck(:id, :name).to_h,
        units: Unit.where(id: owner_ids.call('Unit')).pluck(:id, :marketing_name).to_h,
        base_url: base_url
      }

      amenities.map { |amenity| new(amenity, context).as_json }
    end

    def self.category_options
      Amenity::AMENITY_TYPE.map(&:last).compact_blank
    end

    def initialize(amenity, context)
      @amenity = amenity
      @context = context
    end

    def as_json(*)
      {
        id: amenity.id,
        name: amenity.name,
        category: amenity.amenity_type.presence,
        owner_type: amenity.amenityable_type.presence,
        owner_id: amenity.amenityable_id,
        owner_name: owner_name,
        owner_building: floorplate&.building.presence,
        floor: amenity.floor,
        building: amenity.building.presence,
        plotted: FloorplateSerializer.positioned?(amenity.x_plot, amenity.y_plot, pointer_x),
        # Pin position on the owner's image (pixels), as the plotting pages
        # store it; nil when unplotted or placed by SVG pointer.
        x_plot: amenity.x_plot.to_i.positive? ? amenity.x_plot.to_i : nil,
        y_plot: amenity.y_plot.to_i.positive? ? amenity.y_plot.to_i : nil,
        svg_pointer: UnitSerializer.svg_pointer(amenity.pointer_data),
        tour_stop: context[:tour_stop_ids].include?(amenity.id),
        image: UploadUrl.file(amenity, :image, context[:base_url]),
        gallery: (context[:galleries][amenity.id] || []).map { |photo| gallery_photo(photo) },
        video_link: amenity.video_link.presence,
        description: amenity.description.presence,
        directional_text: amenity.directional_text.presence,
        updated_at: amenity.updated_at
      }
    end

    private

      attr_reader :amenity, :context

      def floorplate
        context[:floorplates][amenity.amenityable_id] if amenity.amenityable_type == 'Floorplate'
      end

      def owner_name
        case amenity.amenityable_type
        when 'Floorplate' then floorplate&.name
        when 'Floorplan' then context[:floorplans][amenity.amenityable_id]
        when 'Unit' then context[:units][amenity.amenityable_id]
        end
      end

      def pointer_x
        amenity.pointer_data.is_a?(Hash) ? amenity.pointer_data['x_plot'] : nil
      end

      def gallery_photo(photo)
        {
          id: photo.id,
          name: photo.name.presence,
          description: photo.description.presence,
          url: UploadUrl.upload(photo, :image, context[:base_url])
        }
      end
  end
end
