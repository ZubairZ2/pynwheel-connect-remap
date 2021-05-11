class AutomatePlottingController < ApplicationController
  def index
    @community = Community.find params[:community_id]
    unless @community.is_sitemap ##community is floor plate
      @floorplates = @community.floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floor_lists = @community.floorplates.map { |x| [x.id, x.floors] }
      @floor = params[:floorNo].present? ? params[:floorNo].to_i : @floorplates[0]
      @floor_lists.each do |ele|
        if ele[1].include?(@floor)
          @floorplate = Floorplate.find(ele[0])
          break
        end
      end
      @hallways = @floorplate.hallways.order("id ASC")
      @access_points = @floorplate.access_points # @floorplate.access_points.select('DISTINCT ON (x_plot, y_plot) *')

      @community_units = @floorplate.fetch_units.includes(:door)
      @unit_with_door = @community_units.map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } }

      @amenities_doors = @floorplate.amenities.includes(:doors)
      @amenity_with_doors = @amenities_doors.map { |amenity| { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } }

      add_breadcrumb "Floor plates", community_floorplates_path(current_community)
      add_breadcrumb "Plot Floor Plate Units", community_floorplate_plotexp_path(current_community, @floorplate)
    end
  end
end
