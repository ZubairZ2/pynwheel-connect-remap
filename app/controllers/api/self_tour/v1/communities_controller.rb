class Api::SelfTour::V1::CommunitiesController < ActionController::Base
  
  before_action :set_community, only: [:customize_stops_list, :initialize_tour]
  before_action :set_community_tour, only: [:customize_stops_list, :initialize_tour]
  before_action :set_tour_user, only: [:customize_stops_list, :initialize_tour]
  before_action :random_string_generator, only: [:initialize_tour]

  include ApplicationHelper
  include StripeServices
  
  def customize_stops_list
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
      @building_list = Buildings.new(@community).get_community_buildings
      @floor_list = Floors.new(@community).get_community_floors
      @floor_list_temp = Floors.new(@community).get_community_temp_floors(@floor_list)
    end
  end

  def initialize_tour
    @floorplans = get_floorplans_with_required_filter()
    @tour = @tours.last
    @tour_type = params[:tour_status] rescue @tour_user.tour_type
    charge_for_id_verfication(@tour_user, 200) if (do_verfication params[:verfied_by_provider], @community)
    update_verification_attributes()
    PropertyAccessCode.new(@community ,@tour_user, @tour_user.tour_type).restrict_property_access_with_code
    @community.update(deleted_ids: [])
  end

  private

  def update_verification_attributes
    if (params[:verfied_by_provider] && params[:verified_at]).present? && @community.tour.visual_id_verification
      @tour_user.update_attributes(authentiq_verified_at: params[:verified_at].to_datetime, is_authentiq_verified: true) if @community.tour.verification_type == "authenteq" && params[:verfied_by_provider] == "authenteq"
      @tour_user.update_attributes(checkpoint_verified_at: params[:verified_at].to_datetime, is_checkpoint_verified: true) if @community.tour.verification_type == "check_point_id" && params[:verfied_by_provider] == "check_point_id"
    end
  end

  def set_community
    @community ||= Community.find(params[:community_id])
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

  def charge_for_id_verfication(tour_user, amount)
    return unless tour_user.strip_customer_id.present?
    charge_customer(tour_user, amount, "Charging for Id verfication", 'usd')
  end

  def do_verfication verfied_by_provider, community
    (verfied_by_provider == "authenteq") && community.tour.tour_setting.present? && community.tour.tour_setting.charge_user_for_id_verfication
  end

end