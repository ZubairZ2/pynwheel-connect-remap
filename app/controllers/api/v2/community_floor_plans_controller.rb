class Api::V2::CommunityFloorPlansController < Api::V2::ApiApplicationController
  before_action :load_community, only: [:index, :show]
  before_action :doorkeeper_authorize!

  def index
    @floorplans = @community.floorplans.order(id: :desc)
    if @floorplans
      render json: {succcess: true, data: @floorplans.as_json}
    else
      render json: {success: false, data: "No floorplans found"}
    end
  end

  def show
    # render  json: "yesss #{params}"
    @floorplan = @community.floorplans.find_by_id(params[:id])
    if @floorplan
      render json: {succcess: true, data: @floorplan.as_json}
    else
      render json: {success: false, data: "No floorplan found"}
    end
  end

  def create

  end

  private
  def load_community
    @community = Community.find params[:community_id]
  end

  def floorplan_params
    params.require(:floorplan).permit(:id)
  end
end
