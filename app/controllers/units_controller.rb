class UnitsController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :set_unit, only: [:edit,:update,:destroy]
  def index
    #@units = @community.units.page(params[:page]).per(10)
    @community_info = Community.includes(:floorplans,:units).find(params[:community_id])
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
      if @unit.manual_override
        if @unit.update(unit_params)
          set_manually_updated_column
          format.html { redirect_to(community_units_path(@community.id), :notice => 'Unit updated successfully.') }
          format.json { respond_with_bip(@unit) }
        else
          flash[:error] = @unit.errors.full_messages.join(',')
          format.html { render :action => "edit" }
          format.json { respond_with_bip(@unit) }
        end
      else
        if params[:unit][:manual_override].present? and params[:unit][:manual_override] == 'true' 
          @unit.update(unit_params)
          set_manually_updated_column
          format.html { redirect_to(community_units_path(@community.id), :notice => 'Unit updated successfully.') }
          format.json { respond_with_bip(@unit) }
        else
          @unit.errors[:base] << "Please set manual override field first"
          flash[:error] = @unit.errors.full_messages.join(',')
          format.html { render :action => "edit" }
          format.json { respond_with_bip(@unit) }
        end
      end
    end
  end
  
  def set_manually_updated_column
    @unit.update_attribute(:manually_updated, true)
    if @unit.sold
      @unit.update_attributes(available: false,availability: "Occupied",available_date: nil,manual_override: true)
    end
    if params[:unit][:available] == 'true'
      @unit.update_attributes(available_date: Date.today-1.day,availability: "Unoccupied",manual_override: true)
    end
    if params[:unit][:available] == 'false'
      @unit.update_attributes(available_date: nil,availability: "Occupied")
    end
  end

  def destroy
    @unit.destroy
    flash[:notice] = "Unit deleted successfully."
    redirect_to community_units_path(:community_id=>@community.id)
  end

  def ajaxplotunit
    unit = @community.units.where(floorplate_id: nil,provider_unit_id: params[:id])
    if unit.present?
      unit = unit.first
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot])
      unit.x_plot = params[:x_plot]
      unit.y_plot = params[:y_plot]
      unit.save(validate: false)
      render json: {unit: unit}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def ajaxplotunitforfloorplate
    unit = @community.units.where(provider_unit_id: params[:id])
    if unit.present?
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      unit = unit.first
      unit.x_plot = params[:x_plot]
      unit.y_plot = params[:y_plot]
      unit.floorplate_id = params[:floorplate_id]
      unit.save(validate: false)
      render json: {unit: unit}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def remove_plot
    @unit = Unit.find_by(provider_unit_id: params[:id],community_id: @community.id) 
    @unit.x_plot = 0
    @unit.y_plot = 0
    if @unit.save(validate: false)
      redirect_to plotexp_community_sitemaps_path(@community), notice: "The plot has been deleted successfully."
    else
      redirect_to plotexp_community_sitemaps_path(@community), error: "Something went wrong."
    end
  end

  def remove_plot_from_floorplate
    @floorplate = Floorplate.find params[:floorplate_id]
    @unit = Unit.find_by(provider_unit_id: params[:id],community_id: @community.id) 
    @unit.x_plot = 0
    @unit.y_plot = 0
    @unit.floorplate_id = nil
    if @unit.save(validate: false)
      redirect_to community_floorplate_plotexp_path(@community,@floorplate), notice: "The plot has been deleted successfully."
    else
      redirect_to community_floorplate_plotexp_path(@community,@floorplate), error: "Something went wrong."
    end
  end

  def adjust_position
    @unit = Unit.find params[:id]
    if params[:horizontal_position].present?
      @unit.x_plot = params[:horizontal_position].to_f
    end
    if params[:vertical_position].present?
      @unit.y_plot = params[:vertical_position].to_f
    end
    @unit.save(validate: false)
    flash[:notice] = "Marker position is adjusted successfully."
    redirect_to params[:redirect_path]
  end


  def set_floor_of_units
    @community.units.where(id: params[:unit_ids]).update_all(floor: params[:floor],updated_by_admin: true)
    flash[:notice] = "Floor is updated for units successfully."
    redirect_to :back
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