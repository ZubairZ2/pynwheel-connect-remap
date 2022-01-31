class Api::V2::CommunityFloorPlanController < Api::V2::ApiApplicationController
  before_action :load_community, only: [:index]

  def index
    @floorplans = @community.floorplans
    if !@floorplans.nil?

    end
  end

  private
  def load_community
    @community = Community.find params[:id]
  end
end
