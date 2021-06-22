class AutomatePlottingController < ApplicationController
  include AssignLocksHelper
  def index
    @community = Community.find params[:community_id]
    @current_locks_provider = existing_locks_provider(@community)
    @all_locks = all_locks(@community)
    tour = @community.tour
    tour_stops = tour&.tour_stops
    @planned_to_visit_units_and_doors_ids     = []
    @planned_to_visit_amenities_and_doors_ids = []
    if @community.is_sitemap
      @sitemap = @community.sitemap
      @hallways = @sitemap.hallways.order("id ASC")
      @access_points = @sitemap.access_points
      planned_to_visit_units_ids     = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
      @community_units = @community.units.are_ploted_units.where(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = @community_units.map do |unit| 
        if planned_to_visit_units_ids.include?(unit.id) && unit.door.present?
          planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
          @planned_to_visit_units_and_doors_ids << unit.door.id
        elsif planned_to_visit_units_ids.include?(unit.id)
          @planned_to_visit_units_and_doors_ids << unit.id
        end 
        { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
      end 

      @amenities_doors = @sitemap.amenities.includes(:doors)
      @amenity_with_doors = @amenities_doors.map do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id) && amenity.doors.present?
          planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
          @planned_to_visit_amenities_and_doors_ids << amenity.doors.first.id # currenly connected with one of multiple door
        elsif planned_to_visit_amenities_ids.include?(amenity.id)
          @planned_to_visit_amenities_and_doors_ids << amenity.id
        end
        { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } 
      end

      add_breadcrumb "SiteMap", community_sitemaps_path(current_community)
      add_breadcrumb "SiteMap Units", plotexp_community_sitemaps_path(current_community)
    else
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
