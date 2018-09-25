class FloorplatesController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
  before_action :set_floorplate, only: [:edit,:update,:destroy]
  def index
    @floorplates = current_community.floorplates.order(id: :desc)
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    if params[:amenities].present?
      @amenities = true
    end
  end

  def new
    @floorplate = Floorplate.new
    add_breadcrumb "Floor plates", community_floorplates_path(current_community)
    add_breadcrumb "Add Floor plate", new_community_floorplate_path(current_community)
  end

  def create
    @floorplate = current_community.floorplates.new(floorplate_params)
    if @floorplate.save
      flash[:notice] = "Floorplate created successfully."
      redirect_to community_floorplates_path(current_community)
    else
      add_breadcrumb "Floor plates", community_floorplates_path(current_community)
        add_breadcrumb "Add Floor plate", new_community_floorplate_path(current_community)
      flash[:error] = @floorplate.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    add_breadcrumb "Edit Floor plate", edit_community_floorplate_path(current_community,@floorplate)
  end

  def update
    if @floorplate.update(floorplate_params)
      flash[:notice] = "Floorplate updated successfully."
      redirect_to community_floorplates_path(current_community)
    else
      add_breadcrumb "Floorplates", community_floorplates_path(current_community)
        add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community,@floorplate)
      flash[:error] = @floorplate.errors.full_messages.join(',')
      render :edit
    end
  end

  def destroy
    @floorplate.destroy
    flash[:notice] = "Floorplate deleted successfully."
    redirect_to community_floorplates_path(current_community)
  end

  def grid_overlay
    @floorplate = Floorplate.find params[:floorplate_id]
    @units = @floorplate.units.order(:building, :unit_type)
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    add_breadcrumb "Grid Overlay", community_floorplate_grid_overlay_path(current_community,@floorplate)
  end

  def adjust_marker_positions
    @floorplate = Floorplate.find params[:floorplate_id]
    @units = @floorplate.units.where("x_plot > ? and y_plot > ?", 0,0).order(:building, :unit_type)
    
    @units.each do |unit|
      if params[:horizontal_position].present?
        unit.x_plot = unit.x_plot.to_f + params[:horizontal_position].to_f
      end
      if params[:vertical_position].present?
        unit.y_plot = unit.y_plot.to_f + params[:vertical_position].to_f
      end
      unit.save(validate: false)
    end
    
    flash[:notice] = "Markers positions are adjusted successfully."
    redirect_to community_floorplate_grid_overlay_path(current_community,@floorplate)
  end

  def plotexp
    @floorplate = Floorplate.find params[:floorplate_id]
    unless current_community.units.size > 0
      flash[:error] = "Please import unit data first"
    end
    @community_units = @floorplate.fetch_units
    add_breadcrumb "Floor plates", community_floorplates_path(current_community)
    add_breadcrumb "Plot Floor Plate Units", community_floorplate_plotexp_path(current_community,@floorplate)
  end

  private

  def floorplate_params
    params.require(:floorplate).permit!
  end

  def  set_floorplate
    @floorplate = Floorplate.find params[:id]
  end
end