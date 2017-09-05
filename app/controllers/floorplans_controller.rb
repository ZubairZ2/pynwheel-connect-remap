class FloorplansController < CommunitiesController
  before_action :set_community
  before_action :set_floorplan, only: [:edit,:update,:destroy]
  def new
    @floorplan = @community.floorplans.new
  end

  def create
    @floorplan = @community.floorplans.new(floorplan_params)
    if @floorplan.save
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      render :new
    end
  end

  def edit

  end

  def update
    if @floorplan.update(floorplan_params)
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      render :new
    end
  end

  def index
    @floorplans = @community.floorplans.page(params[:page]).per(10)
  end

  def destroy
    @floorplan.destroy
    redirect_to community_floorplans_path(:community_id=>@community.id)
  end

  private

  def set_floorplan
    @floorplan = Floorplan.find params[:id]
  end

  def floorplan_params
    params.require(:floorplan).permit!
  end

  def set_community
    @community = Community.find(params[:community_id])
  end
end