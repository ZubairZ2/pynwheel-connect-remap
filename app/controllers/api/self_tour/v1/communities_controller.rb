class Api::SelfTour::V1::CommunitiesController < ActionController::Base
  before_action :set_community, only: [:customize_tour, :initialize_tour, :generate_locks_accesses, :check_lock_access]
  before_action :set_tour_user, only: [:customize_tour, :initialize_tour, :generate_locks_accesses, :check_lock_access]
  before_action :random_string_generator, only: [:initialize_tour]

  include DweloDevicesHelper
  include ApplicationHelper
  include ToursHelper
  include TourStopsHelper
  include StripeServices
  include ShortestPath
  
  def customize_tour
    access = grant_access (decoded(params[:token])) rescue false
    
    if api_access or access == true
      @tour = set_user_tour()
      @building_list = Buildings.new(@community, @tour_user).get_community_buildings
      @floor_list = Floors.new(@community, @tour_user).get_community_floors
      @floor_list_temp = Floors.new(@community, @tour_user).get_community_temp_floors(@floor_list)

    else
      render :json=> {:status=>false, :message => "Invalid Token", code: 401}
    end
  end

  def initialize_tour
    access = grant_access (decoded(params[:token])) rescue false
    
    if api_access or access == true
      TourUserCustomization.new(@community, @tour_user).customize_tour
      @tour = set_user_tour()
      @floorplans = get_floorplans_with_required_filter()
      @tour_type = params[:tour_status] rescue @tour_user.tour_type
      @tour_user.update(tour_type: params[:tour_status], tour_key: @random_string, verified_by: params[:verfied_by_provider])
      
      charge_for_id_verfication(@tour_user, 200) if (do_verfication params[:verfied_by_provider], @community)
      update_verification_attributes()
      PropertyAccessCode.new(@community ,@tour_user, @tour_type).restrict_property_access_with_code
      @community.update(deleted_ids: [])

    else
      render :json=> {:status=>false, :message => "Invalid Token", code: 401}
    end

  end

  def generate_locks_accesses
    access = grant_access (decoded(params[:token])) rescue false

    if api_access or access == true
      create_zerv_user(@community, @tour_user)
        current_time = current_community_time(@community, params)
        lock_access_by_type(params, @community, @tour_user, current_time) if @community.enable_locks and @tour_user.tour_type != "virtual_tour"
        @tour_user.update(lock_access_time: current_time)
      render :json=> {status: true, :message => "Locks access generation is started", code: 200}
    else
      render :json=> {:status=>false, :message => "Invalid Token", code: 401}
    end

  end

  def check_lock_access
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
      counter = check_lock_access_counter(@tour_user)

      if (params[:tour_type] == "self_tour" && @tour_user.tour_type != "guided_tour" && @community.enable_locks)
        if ((@community.multiple_locks_provider.include?("Igloohome") && (@tour_user.igloohome_status == "in progress")) || (@community.multiple_locks_provider.include?("Dwelo") && (@tour_user.dwelo_status == "in progress")) || (@community.multiple_locks_provider.include?("EdgeState")  && (@tour_user.edge_state_status == "in progress")) || (@community.multiple_locks_provider.include?("Latch")  && (@tour_user.latch_status == "in progress")) || (@community.multiple_locks_provider.include?("Zerv")  && (@tour_user.zerv_status == "in progress")) && !(counter >= 20))
          render :json=> {success: "false", completed: false}
        else
          render :json=> {success: "true", completed: true}
        end
      else
        render :json=> {success: "false", completed: false}
      end
    else
      render :json=> {:status=>false, :message => "Invalid Token", code: 401}
    end
  end
  
  private

  def check_lock_access_counter(tu)
    session["check_lock_access"+tu.id.to_s] = 0 if (session["check_lock_access"+tu.id.to_s].nil? || (session["check_lock_access"+tu.id.to_s] == 20))
    session["check_lock_access"+tu.id.to_s] += 1
    puts "&$"*30, session["check_lock_access"+tu.id.to_s]
    session["check_lock_access"+tu.id.to_s]
  end

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

  def set_user_tour
    @tour_user.tours.where(community_id: @community&.id).last
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