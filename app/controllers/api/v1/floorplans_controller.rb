class Api::V1::FloorplansController < ActionController::Base
  include ApplicationHelper
  before_action :authorize_access, only: [:index, :floorplan_units, :update_tour_stops_list]
  before_action :set_community, only: [:index, :floorplan_amenities, :floorplan_units, :update_tour_stops_list]
  before_action :set_tour_user, only: [:update_tour_stops_list]
  before_action :set_tour_user_tour, only: [:update_tour_stops_list]

  def index
    floorplans = floorplan_units_service(@community).get_floorplans
    bedrooms = params[:bedrooms].present? ? params[:bedrooms].split(',') : "any"
    requested_bedrooms = bedrooms.map {|x| x.downcase.eql?("studio") ? "0" : x}
    any_option = bedrooms.map {|b| b.downcase.eql?("any")}
    filtered_floorplans = floorplans.present? ? floorplans.select {|b| requested_bedrooms.include?(b.bedrooms.to_i.to_s) } : [] unless any_option.include?(true) or bedrooms.blank?
    floorplans_list = any_option.include?(true) ? floorplans : filtered_floorplans 
    sorting_param = params[:sort_by].present? ? params[:sort_by] : "default"
    sorted_floorplans = floorplans_list.present? ? sort_floorplans(floorplans_list,sorting_param).uniq : []

    @floorplans = Kaminari.paginate_array(sorted_floorplans).page(params[:page]).per(params[:per_page])
  end

  def floorplan_units
    if params[:floorplan_id].present?
      @floorplan = Floorplan.find_by_id(params[:floorplan_id])
      @units = floorplan_units_service(@community).get_floorplan_units(@floorplan)
      @floors = floorplan_units_service(@community).fetch_floors()
      @floorplates = floorplan_units_service(@community).get_floorplates
    else
      success = false
      message = 'Please provide floorplan id'
    end
  end

  def floorplan_amenities
    @amenities = floorplan_units_service(@community).get_floorplate_amenities
    @floors = floorplan_units_service(@community).fetch_floors()
    @floorplates = floorplan_units_service(@community).get_floorplates
  end


  def update_tour_stops_list
    return unless @tour.present?
    @tour_stop = @tour.tour_stops.where(stop_id: params[:stop_id]).last

    if @tour_stop.present?
      remove_tour_stop(@tour_stop)
    else
      add_tour_stop()
    end
  end

  private

  def set_tour_user
    return unless params[:tour_user_id].present?

    @tour_user ||= TourUser.find_by_id params[:tour_user_id]
  end

  def set_tour_user_tour
    return unless @tour_user.present?

    @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
  end

  def remove_tour_stop(tour_stop)
    stops_count = @tour.tour_stops.where(display_stop: true, stop_type: ["unit", "amenity"]).count

    if stops_count > 1
      floor = params[:floor]
      paths = Path.where(map_path_from_id: tour_stop.stop_id)
      paths.each do |path|
        path.path_points.destroy_all
        path.destroy if path.present?
      end

      path = tour_stop.stop_type.classify.constantize.find_by_id(tour_stop.stop_id)&.paths&.last
      path.path_points.destroy_all if path.present?
      path.destroy if path.present?

      VisitedStop.where(tour_stop_id: tour_stop.id).destroy_all
      
      if tour_stop.stop_type == "elevator"
        (Elevator.find tour_stop.stop_id).destroy if Elevator.where(id: tour_stop.stop_id).any?
      end
      
      if tour_stop.stop_type == "building_starting_point"
        (BuildingStartingPoint.find tour_stop.stop_id).destroy if BuildingStartingPoint.where(id: tour_stop.stop_id).any?
      end
      
      unless @community.is_sitemap
        add_remove_stop_into_sort_hash(floor, tour_stop, "remove")
      end

      if tour_stop.destroy
        render json: { success: true, error_code: 200, message: "Tour stop has been deleted successfully", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200
      else
        render json: { success: false, status_code: 400, message: "Something went wrong, please try again later", data: nil }, status: 400
      end

    elsif stops_count == 1
      render json: { success: true, error_code: 200, message: "Last stop can not be removed", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200
    
    else
      render json: { success: true, error_code: 200, message: "There is no stop to remove", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200  
    end

  end

  def add_tour_stop
    if params[:stop_type] == "amenity"
      st = Amenity.find params[:stop_id]
      st.floor = params[:floor].to_i unless @community.show_map
      st.save
      stName = st.name
    elsif params[:stop_type] == "elevator"
      st = Elevator.find params[:stop_id]
      stName = st.name
    else
      st = Unit.find params[:stop_id]
      stName = st.marketing_name
    end

    ts = TourStop.create(stop_type: params[:stop_type], stop_id: params[:stop_id], latitude: st.x_plot, longitude: st.y_plot, tour_id: @tour.id, name: stName)
    
    unless @community.is_sitemap
      add_remove_stop_into_sort_hash(params[:floor], ts, "add")
    end
    
    PaperTrail::Version.create(item_type: "TourStop", item_id: st.id, event: "create", whodunnit: @community&.users&.first&.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{stName}' community_id: '#{@community.id}'")
    render json: { success: true, error_code: 200, message: "Tour stop has been added successfully", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200
  end

  def set_community
    @community = Community.find params[:community_id]
  end

  def authorize_access
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access
      true
    else
      render :json => { :success => false, status: 401, :message => "Unauthorized, token is invalid" }
    end
  end

  def floorplan_units_service(community)
    FloorplanUnitsService.new(community)
  end

  def sort_floorplans(floorplans_list,sorting_param)

    case sorting_param
    when "floors_asc"
      list = floorplans_list.map { |f| [FloorplanUnitsService.new(@community).get_floorplan_units(f).pluck(:floor).compact.uniq.sort.first, f] }
      sorted_floorplans = list.sort_by{|f| f[0] }
      sorted_floorplans = sorted_floorplans.map{|f| f[1]}
    when "floors_desc"
      list = floorplans_list.map { |f| [FloorplanUnitsService.new(@community).get_floorplan_units(f).pluck(:floor).compact.uniq.sort.first, f] }
      sorted_floorplans = list.sort_by{|f| f[0] }.reverse
      sorted_floorplans = sorted_floorplans.map{|f| f[1]}
    when "sq_ft_asc"
      sorted_floorplans = floorplans_list.sort_by { |f| f.square_feet } 
    when "sq_ft_desc"
      sorted_floorplans = floorplans_list.sort_by { |f| -f.square_feet }
    when "price_asc"
      sorted_floorplans = floorplans_list.sort_by { |f| f.market_rent }
    when "price_desc"
      sorted_floorplans = floorplans_list.sort_by { |f| -f.market_rent }
    else
      sorted_floorplans = floorplans_list.sort_by { |f| -Unit.where(floorplan_id: f.provider_floorplan_id, available: true).count }
    end

    sorted_floorplans
  end

  def add_remove_stop_into_sort_hash(floor_number, tour_stop, request)
    @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue []
    @building_list = building_list
    community_tour_stops_hash = []
    @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list.each do |floor|

          tour_sort_hash = @tour.sort_hash[building + ","+ floor.to_s]
            # if tour_sort_hash.present?
              if floor.eql?(floor_number.to_i)
                if request.eql?("add")
                  tour_sort_hash.push(tour_stop.id.to_s)
                elsif request.eql?("remove")
                  tour_sort_hash.delete(tour_stop.id.to_s)
                else
                  tour_sort_hash
                end
                @tour.sort_hash["#{building},#{floor.to_i}"] = tour_sort_hash
                community_tour_stops_hash = @tour.sort_hash
              end
            # end
        end
      end

    @tour.update_attributes(sort_hash: community_tour_stops_hash) if community_tour_stops_hash.present?
  end

  def building_list
    @building_list = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact
    @building_list = @building_list.compact.reject { |c| c.empty? }.uniq.sort
    @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
    @building_list
  end

end
