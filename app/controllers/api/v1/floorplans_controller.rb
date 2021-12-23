class Api::V1::FloorplansController < ActionController::Base
  include ApplicationHelper

  def index
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
      @community = Community.find params[:community_id]
      floorplans = FloorplanUnitsService.new(@community).get_floorplans
      @floorplans = Kaminari.paginate_array(floorplans).page(params[:page]).per(params[:per_page])
    end
  end

end
