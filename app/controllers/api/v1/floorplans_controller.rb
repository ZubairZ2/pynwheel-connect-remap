class Api::V1::FloorplansController < ActionController::Base

  def index
    @community = Community.find params[:community_id]
    @floorplans = FloorplanUnitsService.new(@community).get_floorplans
  end

end
