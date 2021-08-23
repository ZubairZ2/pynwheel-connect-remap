class AutomatePlottingController < ApplicationController
  include AssignLocksHelper
  include ShortestPath
  def index
    @community = Community.find params[:community_id]
    @current_locks_provider = existing_locks_provider(@community)
    @all_locks = all_locks(@community)
    tour = @community.tour
    tour_stops = tour&.tour_stops.visible.order('sort ASC')
    @precedence_arr = tour_stops.pluck(:stop_id, :stop_type) # due to sortable gem its sorted so we fetch in a line 
    @planned_to_visit_units_and_doors_ids     = []
    @planned_to_visit_amenities_and_doors_ids = []
    if @community.is_sitemap
      @sitemap = @community.sitemap
      @hallways = make_sure_one_selected_hallway(@sitemap.hallways.order("id ASC"))
      #@access_points = @sitemap.access_points
      planned_to_visit_units_ids     = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
      @community_units = @community.units.are_ploted_units.where(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = @community_units.map do |unit| 
        if planned_to_visit_units_ids.include?(unit.id) && unit.door.present?
          planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
          @planned_to_visit_units_and_doors_ids << unit.door.id
          update_precedence('unit', unit.id, unit.door.id)
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
          update_precedence('amenity', amenity.id, amenity.doors.first.id)
        elsif planned_to_visit_amenities_ids.include?(amenity.id)
          @planned_to_visit_amenities_and_doors_ids << amenity.id
        end
        { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } 
      end

      add_breadcrumb "SiteMap", community_sitemaps_path(current_community)
      add_breadcrumb "Automate plotting"
    else
      # this else is only works for one building only
      @floor_lists_hash, @hallways, @community_units, @unit_with_door, @amenities_doors, @amenity_with_doors, @elevators = {}, {}, {}, {}, {}, {}, {}
      @floorplates = @community.floorplates
      #@access_points = @floorplate.access_points # @floorplate.access_points.select('DISTINCT ON (x_plot, y_plot) *')
      @floors = @floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floor_lists = @community.floorplates.map { |x| [x.id, x.floors] }
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floor_to_floorplate = fetch_hash_for_floor_to_floorplate()
      @floor_to_floorplate_name_units = @floors.map {|floor| @floor_to_floorplate[floor].name + " Units" }

      @floors.each do |floor|
        @hallways[floor] = make_sure_one_selected_hallway(@floor_to_floorplate[floor].hallways.order("id ASC"))
        @community_units[floor] = @floor_to_floorplate[floor].units.where(floor: floor).includes(:door)
        @amenities_doors[floor] = @floor_to_floorplate[floor].amenities.where(floor: floor).includes(:doors)
        @elevators[floor] = @floor_to_floorplate[floor].fetch_elevators(floor)
        # unit_with_door and amenity_with_door for automate_path button and used in js 
        @unit_with_door[floor] = @community_units[floor].map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } } rescue []
        @amenity_with_doors[floor] = @amenities_doors[floor].map { |amenity| { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } } rescue []
      end
      # Before
      # @floor = params[:floorNo].present? ? params[:floorNo].to_i : @floors[0]
      # @floor_lists.each do |ele|
      #   if ele[1].include?(@floor)
      #     @floorplate = Floorplate.find(ele[0])
      #     break
      #   end
      # end
      # @hallways = @floorplate.hallways.order("id ASC")
      # @community_units = @floorplate.fetch_units_for_sepcific_floor(@floor).includes(:door)
      # @unit_with_door = @community_units.map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } }

      # @amenities_doors = @floorplate.amenities.includes(:doors)
      # @amenity_with_doors = @amenities_doors.map { |amenity| { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } }
      # @elevators = @floorplate.fetch_elevators(@floor)

      add_breadcrumb "Floor plates", community_floorplates_path(current_community)
      add_breadcrumb "Automate plotting"
    end
  end

  def shortest_path
    community = Community.find params[:community_id]
    if community.is_sitemap
      path_object_in_order = return_path_for_sitemap(params[:community_id], params[:path_type]) rescue []
    else
      path_object_in_order = return_path_for_floorplate(params[:community_id], params[:path_type]) rescue []
    end
    render :json => {path_object: path_object_in_order.to_json}, :status => 200
  end

  private

    def update_precedence(stop_type, stop_id, door_id)
      @precedence_arr.each_with_index do |arr,index|
        if arr[1] == stop_type && arr[0] == stop_id
          @precedence_arr[index] = [door_id, stop_type]
          break
        end
      end
    end
    def fetch_hash_for_floor_to_floorplate_id()
      h = {}
      @floor_lists_hash.each do |key, arr|
        arr.each do |floor|
          h[floor] = key
        end
      end
      h
    end
    def fetch_hash_for_floor_to_floorplate
      floor_to_floorplate = {}
      @floor_to_floorplate_id.keys.sort.each do |floor|
        floor_to_floorplate[floor] = Floorplate.find(@floor_to_floorplate_id[floor])
      end
      floor_to_floorplate
    end
end
