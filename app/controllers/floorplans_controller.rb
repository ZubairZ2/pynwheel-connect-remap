class FloorplansController < CommunitiesController
  before_action :set_community
  before_action :set_floorplan, only: [:edit,:update,:destroy]

  def index
    #@floorplans = @community.floorplans.page(params[:page]).per(10)
    @floorplans = @community.floorplans
    @communities = Community.select(:id,:name)
  end

  def new
    @floorplan = @community.floorplans.new
  end

  def create
    @floorplan = @community.floorplans.new(floorplan_params)
    if @floorplan.save
      flash[:notice] = "Floorplan created successfully."
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      flash[:notice] = @floorplan.errors.full_messages.join(',')
      render :new
    end
  end

  def edit

  end

  def update
    if @floorplan.update(floorplan_params)
      flash[:notice] = "Floorplan updated successfully."
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      flash[:notice] = @floorplan.errors.full_messages.join(',')
      render :edit
    end
  end


  def destroy
    @floorplan.destroy
    flash[:notice] = "Floorplan deleted successfully."
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