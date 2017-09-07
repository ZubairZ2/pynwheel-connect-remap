class UnitsController < CommunitiesController
  before_action :set_community
  def index
    @units = @community.units.page(params[:page]).per(10)
    @communities = Community.select(:id,:name)
  end

  private
  def set_community
    @community = Community.find(params[:community_id])
  end

end