class AutomatePlottingController < ApplicationController
  include AssignLocksHelper
  include ShortestPath
  include Connect::WayfindingJson
  def index
    # Pynwheel Connect's read-only Map & Plotting: the page's data as JSON,
    # before anything below runs (see Connect::WayfindingJson).
    return render_connect_wayfinding if request.format.json?

    @community = Community.find params[:community_id]
    @current_locks_provider = existing_locks_provider(@community)
    @all_locks = all_locks(@community)
    @tour = @community.community_tour
    @tour_stops = @tour&.tour_stops.visible.order('sort ASC')
    @precedence_arr = @tour_stops.pluck(:stop_id, :stop_type) # due to sortable gem its sorted so we fetch in a line 
    @planned_to_visit_units_and_doors_ids     = []
    @planned_to_visit_amenities_and_doors_ids = []
    if @community.is_sitemap
      fetch_data_for_sitemap
      add_breadcrumb "SiteMap", community_sitemaps_path(current_community)
    else
      sorted_building = @tour.building_order
      @building_list = @community.fetch_building_list(sorted_building)
      if @building_list.count  < 2 # means there is only building in floorplate community
        fetch_data_for_floorplate_and_single_building
      else # means this community is a multiple building property
        fetch_data_for_floorplate_and_multiple_buildings
      end
      add_breadcrumb "Floor plates", community_floorplates_path(current_community)
    end
    add_breadcrumb "Auto Wayfinding"
  end

  def shortest_path
    community = Community.find params[:community_id]
    if community.is_sitemap
      path_object_in_order = begin; return_path_for_sitemap(params[:community_id], params[:path_type]); rescue; []; end
      response = {path_object: path_object_in_order.to_json}
    else
      sorted_building = community.community_tour.building_order
      @building_list = @community.fetch_building_list(sorted_building)
      if @building_list.count  < 2 # means there is only one building in floorplate community
        path_object_in_order, floor_ids = begin; return_path_for_floorplate(params[:community_id], params[:path_type]); rescue; []; end
        is_multiple_buildings = false
      else # means this community is a multiple building property
        path_object_in_order, floor_ids = begin; return_floorplate_path_for_multiple_buildings(@building_list, params[:community_id], params[:path_type]); rescue; []; end
        is_multiple_buildings = true
      end        
      response = {path_object: path_object_in_order.to_json, floor_ids: floor_ids.to_json, is_multiple_buildings: is_multiple_buildings}
    end
    render :json => response, :status => 200
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

    def fetch_data_for_sitemap
      @sitemap = @community.sitemap
      @hallways = make_sure_one_selected_hallway(@sitemap.hallways.order("id ASC"))
      #@access_points = @sitemap.access_points
      planned_to_visit_units_ids     = @tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = @tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
      @community_units = @community.units.are_plotted_units(@community.enable_svg_mode?).where(floorplate_id: nil).where(id: planned_to_visit_units_ids).order(:building, :unit_type).includes(:door) # only plotted units
      # In future we will @unit_with_door it for plotting or delete unit stop
      @unit_with_door = @community_units.map do |unit|
        if planned_to_visit_units_ids.include?(unit.id) 
          if unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence('unit', unit.id, unit.door.id)
          else planned_to_visit_units_ids.include?(unit.id)
            @planned_to_visit_units_and_doors_ids << unit.id
          end 
          { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
        end
      end 
      @all_amenities = @sitemap.amenities.where(id: planned_to_visit_amenities_ids)
      @amenities_doors = @sitemap.amenities.where(id: planned_to_visit_amenities_ids).includes(:doors)
      # In future we will @amenity_with_doors it for plotting or delete unit stop
      @amenity_with_doors = @amenities_doors.map do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id) && amenity.ordered_doors.present?
          planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
          @planned_to_visit_amenities_and_doors_ids << amenity.ordered_doors.first.id # currenly connected with one of multiple door
          update_precedence('amenity', amenity.id, amenity.ordered_doors.first.id)
        elsif planned_to_visit_amenities_ids.include?(amenity.id)
          @planned_to_visit_amenities_and_doors_ids << amenity.id
        end
        { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.ordered_doors.present? ? amenity.ordered_doors : {} } } 
      end
    end

    def fetch_data_for_floorplate_and_single_building
      @floor_lists_hash, @hallways, @community_units, @unit_with_door, @amenities_doors, @amenity_with_doors, @elevators = {}, {}, {}, {}, {}, {}, {}
      @floorplates = @community.floorplates
      #@access_points = @floorplate.access_points # @floorplate.access_points.select('DISTINCT ON (x_plot, y_plot) *')
      @floors = @floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floor_lists = @community.floorplates.map { |x| [x.id, x.floors] }
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floor_to_floorplate = fetch_hash_for_floor_to_floorplate()
      planned_to_visit_units_ids     = @tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = @tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
      @floors.each do |floor|
        @hallways[floor] = make_sure_one_selected_hallway(@floor_to_floorplate[floor].hallways.order("id ASC"))
        @community_units[floor] = @floor_to_floorplate[floor].units.where(floor: floor).where(id: planned_to_visit_units_ids).includes(:door)
        @amenities_doors[floor] = @floor_to_floorplate[floor].amenities.where(floor: floor).where(id: planned_to_visit_amenities_ids).includes(:doors)
        @elevators[floor] = @floor_to_floorplate[floor].fetch_elevators(floor)
        # unit_with_door and amenity_with_door for automate_path button and used in js 
        @unit_with_door[floor] = @community_units[floor].map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } } rescue []
        @amenity_with_doors[floor] = @amenities_doors[floor].map { |amenity| { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.ordered_doors.present? ? amenity.ordered_doors : {} } } } rescue []
      end
    end

    def fetch_data_for_floorplate_and_multiple_buildings
      @floor_lists_hash, @hallways, @community_units, @unit_with_door, @amenities_doors, @amenity_with_doors, @elevators = {}, {}, {}, {}, {}, {}, {}
      @floorplates = @community.floorplates
      @floors = @floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floor_lists = @community.floorplates.map { |x| [x.id, x.floors] }
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floor_to_floorplate = fetch_hash_for_floor_to_floorplate()
      planned_to_visit_units_ids     = @tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = @tour_stops.where(stop_type: "amenity", display_stop: true).pluck(:stop_id) rescue []
      building_starting_exit_points_ids = @tour_stops.where(stop_type: "building_starting_point", display_stop: true).pluck(:stop_id) rescue []
      @building_starting_exit_points = BuildingStartingPoint.fetch_building_starting_exit_points(building_starting_exit_points_ids)
      @building_list.each do |building|
        @floors.each do |floor|
          hallway_hash = { floor => make_sure_one_selected_hallway(@floor_to_floorplate[floor].hallways.order("id ASC")) }
          @hallways[building.parameterize.underscore] = @hallways[building.parameterize.underscore].present? ? @hallways[building.parameterize.underscore].merge(hallway_hash) : hallway_hash
          community_unit_hash = { floor => @floor_to_floorplate[floor].units.where(building: building,floor: floor).where(id: planned_to_visit_units_ids).includes(:door) }
          @community_units[building] = @community_units[building].present? ? @community_units[building].merge(community_unit_hash) : community_unit_hash
          amenities_doors_hash = { floor => @floor_to_floorplate[floor].amenities.where(building: building, floor: floor).where(id: planned_to_visit_amenities_ids).includes(:doors) }
          @amenities_doors[building] = @amenities_doors[building].present? ? @amenities_doors[building].merge(amenities_doors_hash) : amenities_doors_hash
          elevators_hash = { floor => @floor_to_floorplate[floor].fetch_elevators(floor, building) }
          @elevators[building] = @elevators[building].present? ? @elevators[building].merge(elevators_hash) : elevators_hash
          # unit_with_door and amenity_with_door for automate_path button and used in js 
          unit_with_door_hash = { floor => (@community_units[building][floor].map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } } rescue []) }
          @unit_with_door[building] = @unit_with_door[building].present? ? @unit_with_door[building].merge(unit_with_door_hash) : unit_with_door_hash
          amenity_with_doors_hash = { floor => (@amenities_doors[building][floor].map { |amenity| { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.ordered_doors.present? ? amenity.ordered_doors : {} } } } rescue []) }
          @amenity_with_doors[building] = @amenity_with_doors[building].present? ? @amenity_with_doors[building].merge(amenity_with_doors_hash) : amenity_with_doors_hash
        end
      end
    end
end
