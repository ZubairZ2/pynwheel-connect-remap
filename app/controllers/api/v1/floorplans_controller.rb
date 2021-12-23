class Api::V1::FloorplansController < ActionController::Base

  def index
    @community = Community.find params[:community_id]
    floorplans = FloorplanUnitsService.new(@community).get_floorplans
    @floorplans = Kaminari.paginate_array(floorplans).page(params[:page]).per(params[:per_page])
  end

end
