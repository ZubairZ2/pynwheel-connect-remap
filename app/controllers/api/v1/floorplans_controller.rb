class Api::V1::FloorplansController < ActionController::Base
  include ApplicationHelper
  before_action :authorize_access, only: [:index, :floorplan_units]
  before_action :set_community, only: [:index, :floorplan_units]

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
      @floors.each do |floor|
        @floorplate_units = @units.where(floor: floor)
      end
      @floorplates = floorplan_units_service(@community).get_floorplates
    else
      success = false
      message = 'Please provide floorplan id'
    end
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
