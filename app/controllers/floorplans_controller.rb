class FloorplansController < ApplicationController
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Appartments", "##"
  before_action :set_community
  before_action :set_floorplan, only: [:edit,:update,:destroy]

  def index
    #@floorplans = @community.floorplans.page(params[:page]).per(10)
    @floorplans = @community.floorplans
    @communities = Community.select(:id,:name)
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
  end

  def new
    @floorplan = @community.floorplans.new
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
    add_breadcrumb "Add Floor plan", new_community_floorplan_path(@community)
  end

  def create
    @floorplan = @community.floorplans.new(floorplan_params)
    if @floorplan.save
      flash[:notice] = "Floor plan created successfully."
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      flash[:notice] = @floorplan.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
    add_breadcrumb "Edit Floor plan", "##"
  end

  def update
    if @floorplan.update(floorplan_params)
      flash[:notice] = "Floor plan updated successfully."
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      flash[:notice] = @floorplan.errors.full_messages.join(',')
      render :edit
    end
  end


  def destroy
    @floorplan.destroy
    flash[:notice] = "Floor plan deleted successfully."
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