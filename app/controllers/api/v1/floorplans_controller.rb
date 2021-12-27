class Api::V1::FloorplansController < ActionController::Base
  include ApplicationHelper
  before_action :authorize_access, only: [:index, :floorplan_units]
  before_action :set_community, only: [:index, :floorplan_units]

  def index
    floorplans = FloorplanUnitsService.new(@community).get_floorplans
    bedrooms = params[:bedrooms].present? ? params[:bedrooms] : "any"
    filtered_floorplans = floorplans.present? ? floorplans.select {|b| bedrooms.split(',').include?(b.bedrooms) } : [] unless bedrooms.eql?("any") or bedrooms.blank?
    floorplans_to_be_sorted = params[:bedrooms].eql?("any") ? floorplans : filtered_floorplans 
    sorting_param = params[:sort_by].present? ? params[:sort_by] : "default" 
    sorted_floorplans = floorplans_to_be_sorted.present? ? sort_floorplans(floorplans_to_be_sorted,sorting_param).uniq : []
    @floorplans = Kaminari.paginate_array(sorted_floorplans).page(params[:page]).per(params[:per_page])
  end

  def floorplan_units
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

end
