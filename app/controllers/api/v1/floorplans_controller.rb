class Api::V1::FloorplansController < ActionController::Base
  include ApplicationHelper
  before_action :authorize_access, only: [:index, :floorplan_units, :update_tour_stops_list]
  before_action :set_community, only: [:index, :floorplan_units, :update_tour_stops_list]

  def index
    floorplans = floorplan_units_service(@community).get_floorplans
    bedrooms = params[:bedrooms].present? ? params[:bedrooms].split(',') : "any"
    requested_bedrooms = bedrooms.map {|x| x.downcase.eql?("studio") ? "0" : x}
    any_option = bedrooms.map {|b| b.downcase.eql?("any")}
    filtered_floorplans = floorplans.present? ? floorplans.select {|b| requested_bedrooms.include?(b.bedrooms) } : [] unless any_option.include?(true) or bedrooms.blank?
    floorplans_to_be_sorted = any_option.include?(true) ? floorplans : filtered_floorplans 
    sorting_param = params[:sort_by].present? ? params[:sort_by] : "default" 
    sorted_floorplans = floorplans_to_be_sorted.present? ? sort_floorplans(floorplans_to_be_sorted,sorting_param).uniq : []
    @floorplans = Kaminari.paginate_array(sorted_floorplans).page(params[:page]).per(params[:per_page])
  end

  def floorplan_units
    floorplan_id = params[:floorplan_id]
    if floorplan_id.present?
      @floorplan = Floorplan.find_by_id(floorplan_id)
      @units = floorplan_units_service(@community).get_floorplan_units(@floorplan)
      @floors = floorplan_units_service(@community).fetch_floors()
      @floorplates = floorplan_units_service(@community).get_floorplates
    else
      success = false
      message = 'Please provide floorplan id'
    end
  end

  def update_tour_stops_list
    @tour_stop = TourStop.find_by_stop_id params[:stop_id]
    if @tour_stop.present?
      remove_tour_stop(@tour_stop)
    else
      add_tour_stop()
    end
  end

  def remove_tour_stop(tour_stop)
    paths = Path.where(map_path_from_id: tour_stop.stop_id)
    paths.each do |path|
      path.path_points.destroy_all
      path.destroy if path.present?
    end

    path = tour_stop.stop_type.classify.constantize.find_by_id(tour_stop.stop_id)&.paths&.last
    path.path_points.destroy_all if path.present?
    path.destroy if path.present?

    VisitedStop.where(tour_stop_id: tour_stop.id).destroy_all
    if @tour_stop.stop_type == "elevator"
      (Elevator.find tour_stop.stop_id).destroy if Elevator.where(id: tour_stop.stop_id).any?
    end
    if @tour_stop.stop_type == "building_starting_point"
      (BuildingStartingPoint.find tour_stop.stop_id).destroy if BuildingStartingPoint.where(id: tour_stop.stop_id).any?
    end
    if @tour_stop.destroy
      render json: { success: true, error_code: 200, message: "Tour stop has been deleted successfully", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200
    else
      render json: { success: false, status_code: 400, message: "Something went wrong, please try again later", data: nil }, status: 400
    end
  end

  def add_tour_stop
    tour_stop = params[:stop_id] #tour_stop.id
    stop_type = params[:stop_type] #tour_stop.stop_type
    floor = params[:floor]
    if stop_type == "amenity"
      st = Amenity.find tour_stop
      st.floor = floor.to_i unless @community.show_map
      st.save
      stName = st.name
    elsif stop_type == "elevator"
      st = Elevator.find tour_stop
      stName = st.name
    else
      st = Unit.find tour_stop
      stName = st.marketing_name
    end
    ts = TourStop.create(stop_type: stop_type, stop_id: tour_stop,latitude: st.x_plot,longitude: st.y_plot,tour_id: @community.tour.id,name: stName)
    
    # unless @community.is_sitemap
    #   add_stop_into_sort_hash(floor,ts)
    # end
    PaperTrail::Version.create(item_type: "TourStop",item_id: st.id,event: "create",whodunnit: @community&.users&.first&.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{stName}' community_id: '#{@community.id}'")
    render json: { success: true, error_code: 200, message: "Tour stop has been added successfully", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200
  end

  def add_stop_into_sort_hash(floor_number,tour_stop)
    
    @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue []
    @building_list = building_list

    @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list.each do |floor|
          tour_sort_hash = @community.tour.sort_hash[building + ","+ floor.to_s]
            if tour_sort_hash.present?
              if floor.eql?(floor_number.to_i)
                tour_sort_hash.push(tour_stop.id.to_s) 
                @community.tour.sort_hash["#{building},#{floor.to_i}"] = tour_sort_hash
              end
            end
        end
      end
  end

  def building_list
    @building_list = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact
    @building_list = @building_list.compact.reject { |c| c.empty? }.uniq.sort
    @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
    @building_list
  end

  private

  def set_community
    @community = Community.find params[:community_id]
  end

  def sort_floorplans(floorplans_to_be_sorted,sorting_param)
    case sorting_param
    when "floors_asc"
      floorplans_to_be_sorted.sort_by { |f| Unit.where(floorplan_id: f.provider_floorplan_id, available: true).pluck(:floor).count } 
    when "floors_desc"
      floorplans_to_be_sorted.sort_by { |f| -Unit.where(floorplan_id: f.provider_floorplan_id, available: true).pluck(:floor).count }
    when "sq_ft_asc"
      floorplans_to_be_sorted.sort_by { |f| f.square_feet } 
    when "sq_ft_desc"
      floorplans_to_be_sorted.sort_by { |f| -f.square_feet }
    when "price_asc"
      floorplans_to_be_sorted.sort_by { |f| f.market_rent } 
    when "price_desc"
      floorplans_to_be_sorted.sort_by { |f| -f.market_rent }
    else
      floorplans_to_be_sorted.sort_by { |f| -Unit.where(floorplan_id: f.provider_floorplan_id, available: true).count }
    end      
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
end
