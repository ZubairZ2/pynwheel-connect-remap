class Api::V2::CommunitiesController < ActionController::Base
  before_action :set_community, only: [:customize_stops_list, :property_access_code]
  before_action :set_community_tour, only: [:customize_stops_list]
  before_action :set_tour_user, only: [:customize_stops_list, :property_access_code]
  before_action :random_string_generator, only: [:property_access_code]

  def customize_stops_list
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
      @building_list = Buildings.new(@community).get_community_buildings
      @floor_list = Floors.new(@community).get_community_floors
      @floor_list_temp = Floors.new(@community).get_community_temp_floors(@floor_list)
    end
  end


  def property_access_code
    @floorplans = get_floorplans_with_required_filter()
    @tour_type = params[:tour_status] rescue @tour_user.tour_type
    PropertyAccessCode.new(@community ,@tour_user, @tour_user.tour_type).restrict_property_access_with_code
  end

  private

  def set_community
    @community ||= Community.find(params[:id])
  end

  def set_tour_user
    @tour_user ||= TourUser.find_by_id(params[:tour_user_id])
  end

  def random_string_generator
    @random_string = SecureRandom.hex
  end

  def set_community_tour
    @tours = []
    @tours <<  @community.tour
    @tours
  end

  def get_floorplans_with_required_filter
    all_floorplans = FloorplanUnitsService.new(@community).get_floorplans
    all_floorplans = all_floorplans.sort_by {|f| f.bedrooms}.uniq { |b| b.bedrooms }
    all_floorplans
  end

end