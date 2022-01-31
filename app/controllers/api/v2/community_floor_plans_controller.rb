class Api::V2::CommunityFloorPlanController < Api::V2::ApiApplicationController
  before_action :load_community, only: [:index]
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
    @community = Community.find params[:id]
  end
end
