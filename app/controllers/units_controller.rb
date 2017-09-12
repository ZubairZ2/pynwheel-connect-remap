class UnitsController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :set_unit, only: [:edit,:update,:destroy]
  def index
    #@units = @community.units.page(params[:page]).per(10)
    @units = @community.units
    @communities = Community.select(:id,:name)
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
      flash[:notice] = @unit.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Units", community_units_path(@community)
    add_breadcrumb "Edit Unit","##"
  end

  def update
    if @unit.update(unit_params)
      flash[:notice] = "Unit updated successfully."
      redirect_to community_units_path(:community_id=>@community.id)
    else
      flash[:notice] = @unit.errors.full_messages.join(',')
      render :edit
    end
  end
  def destroy
    @unit.destroy
    flash[:notice] = "Unit deleted successfully."
    redirect_to community_units_path(:community_id=>@community.id)
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