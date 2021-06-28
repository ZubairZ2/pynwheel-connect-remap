class Api::V1::ScheduleToursController < ActionController::Base
  before_action :authenticate_token!, except: [:authorize_vendor]
  before_action :find_community, only: [:tour_types]

  def authorize_vendor
    @api_access_key = authorize_params[:api_access_key]
    if @api_access_key == vender_api_access_key
      render :authorize_vendor
    else
      render json: { is_success: true, error_code: 400, message: "Your access key is invalid, please contact to support", data: nil }
    end
  end

  def communities
    @communities = Community.joins(:tour).where('tours.only_scheduled_tour = ?',true).self_tour_enabled_only.desc_created_at
    if @communities.present?
      render :communities
    else
      render json: { is_success: true, error_code: 400, message: "No Communities were not", data: nil }
    end
  end

  def tour_types
    @tour_types ||= []
    tour_setting = @community.tour&.tour_setting
    binding.pry
    @tour_types << {title: "Self Tour"} if tour_setting&.allow_self_tour
    @tour_types << {title: "Guided Tour"} if tour_setting&.allow_guided_tour
    @tour_types << {title: "Virtual Tour"} if tour_setting&.allow_virtual_tour
    if @tour_types.present?
     render :tour_types
    else
      render json: { is_success: true, error_code: 400, message: "No Tour has been allowed for this community", data: nil }
    end
  end

  def tour_dates
    @self_opening_hours = @community.opening_hours.order(:sort).all
    @community_opening_hours = community.guided_opening_hours.order(:sort).all

  end
  
  private

  def find_community
    # community_id = JsonWebToken.decode(params[:property_code])
    @community = Community.joins(:tour).where('tours.only_scheduled_tour = ?',true).self_tour_enabled_only.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { is_success: false, error_code: 400, message: "Community not found.", data: nil }, status: :not_found
  end

  def authorize_params
    params.permit(:api_access_key)
  end
  
  def authenticate_token!
    payload = JsonWebToken.decode(auth_token)
    render json: {is_success: false, error_code: 400, message: "Invalid auth token", data: nil } if vender_api_access_key != payload["sub"] 
    rescue JWT::DecodeError
      render json: {is_success: false, error_code: 400, message: "Invalid auth token", data: nil }
  end

  def auth_token
    @auth_token ||= request.headers['Authorization']
  end

  def vender_api_access_key
    ENV['APPARTMENTS.COM_API_KEY_ACCESS']
  end

end
