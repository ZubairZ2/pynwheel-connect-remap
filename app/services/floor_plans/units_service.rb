module FloorPlans
  class UnitsService < FloorPlans::BaseService

    def update_floorplan_units_description
      return unless @floorplan.present? && @community.present?
      @floorplan_units.update_all(description: @floorplan.description)
    end

    def create_floorplan_units_image source, name, amenity_id
      @floorplan_units&.each do |floorplan_unit|
        floorplan_unit.amenities.create!(image: source, name: name, floorplan_amenity_id: amenity_id)
      rescue => error
        puts error.inspect
      end
    end

    def delete_floorplan_units_image amenity_id
      @floorplan_units.includes(:amenities).each do |floorplan_unit|
        floorplan_unit.amenities.where(floorplan_amenity_id: amenity_id).destroy_all
      end
    end
  end
end