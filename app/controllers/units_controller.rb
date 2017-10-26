class UnitsController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :set_unit, only: [:edit,:update,:destroy]
  def index
    #@units = @community.units.page(params[:page]).per(10)
    @units = @community.units.order(unit_type: :desc)
    @communities = current_company.communities
    add_breadcrumb "Units", community_units_path(@community)
  end

  def new
    @unit = @community.units.new
    add_breadcrumb "Units", community_units_path(@community)
    add_breadcrumb "Add Unit", new_community_unit_path
  end

  def create
    @unit = @community.units.new(unit_params)
    if @unit.save
      flash[:notice] = "Unit created successfully."
      redirect_to community_units_path(:community_id=>@community.id)
    else
      flash[:error] = @unit.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Units", community_units_path(@community)
    add_breadcrumb "Edit Unit",edit_community_unit_path(@community,@unit)
  end

  def update
    respond_to do |format|
      if @unit.update(unit_params)
        format.html { redirect_to(community_units_path(@community.id), :notice => 'Unit updated successfully.') }
        format.json { respond_with_bip(@unit) }
      else
        format.html { render :action => "edit", :error => @unit.errors.full_messages.join(',') }
        format.json { respond_with_bip(@unit) }
      end
    end
  end

  def destroy
    @unit.destroy
    flash[:notice] = "Unit deleted successfully."
    redirect_to community_units_path(:community_id=>@community.id)
  end

  def ajaxplotunit
    unit = @community.units.where(marketing_name: params[:id])
    if unit.present?
      unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot])
      render json: {unit: unit.first}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def ajaxplotunitforfloorplate
    unit = @community.units.where(marketing_name: params[:id])
    if unit.present?
      unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      render json: {unit: unit.first}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def remove_plot
    @unit = @community.units.where(marketing_name: params[:id])
    if @unit.present?
      x_plot = @unit.first.x_plot
      y_plot = @unit.first.y_plot
      units = @community.units.where(x_plot: x_plot,y_plot: y_plot)
      units.each do |unit|
        unit.update_attributes(x_plot: 0,y_plot:0)
      end
      redirect_to plotexp_community_sitemaps_path(@community), notice: "The plot has been deleted successfully."
    end
  end

  def remove_plot_from_floorplate
    @floorplate = Floorplate.find params[:floorplate_id]
    @unit = @community.units.where(marketing_name: params[:id])
    if @unit.present?
      x_plot = @unit.first.x_plot
      y_plot = @unit.first.y_plot
      units = @community.units.where(x_plot: x_plot,y_plot: y_plot)
      units.each do |unit|
        unit.update_attributes(x_plot: 0,y_plot:0)
      end
      redirect_to community_floorplate_plotexp_path(current_community,@floorplate), notice: "The plot has been deleted successfully."
    end
  end

  private
  def set_community
    @community = Community.find(params[:community_id])
  end
  def unit_params
    params.require(:unit).permit!
  end
  def set_unit
    @unit = Unit.find params[:id]
  end

end