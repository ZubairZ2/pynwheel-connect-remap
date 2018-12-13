class UnitsController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :check_community
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
    @unit.provider = "manually"
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
        if params[:unit][:description].present?
          params[:unit][:description] = add_padding_description params[:unit][:description]
        end
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
    # @unit.update_attribute(:manually_updated, true)
    if @unit.sold
      @unit.update_attributes(availability: "Occupied",available_date: '')
    end
    if params[:unit][:available] == 'true'

      @unit.update_attributes(availability: "Unoccupied",available_date: Date.today-1,available: true)
    end
    if params[:unit][:available] == 'false'
      @unit.update_attributes(availability: "Occupied",available: false)
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


  def set_floor
    @community.units.where(id: params[:unit_ids]).update_all(floor: params[:floor],manually_updated: true)
    flash[:notice] = "Floor is updated for units successfully."
    redirect_to :back
  end

  def set_available_date
    @community.units.where(id: params[:unit_ids]).update_all(available_date: params[:available_date],manually_updated: true)
    flash[:notice] = "Available date is updated for units successfully."
    redirect_to :back
  end
  
  def set_available
    if params[:available] == 'true'
      @community.units.where(id: params[:unit_ids]).update_all(availability: "Unoccupied",manually_updated: true,available_date: Date.today-1,available: true)
    else
      @community.units.where(id: params[:unit_ids]).update_all(availability: "Occupied",manually_updated: true,available: false)
    end
    flash[:notice] = "Available is updated for units successfully."
    redirect_to :back
  end
  
  def set_manual_override
    @community.units.where(id: params[:unit_ids]).update_all(manual_override: params[:manual_override])
    flash[:notice] = "Manual Override is updated for units successfully."
    redirect_to :back
  end
  
  def set_sold
    @community.units.where(id: params[:unit_ids]).update_all(sold: params[:sold],manually_updated: true)
    flash[:notice] = "Sold is updated for units successfully."
    redirect_to :back
  end
  def add_description

    description = params[:description].to_s
    desc = description[2..description.length-3]
    str2 = add_padding_description desc

    @community.units.where(id: params[:unit_ids]).update_all(description:  str2,manually_updated: true)
    flash[:notice] = "description is updated for units successfully."
    redirect_to :back
  end

  def add_padding_description(desc)
    str = ""
    ds = desc.split('<ul>') # Adding padding for <ul>
    if ds.count > 1
      ds.each do |d|
        unless d == ""
          if d.include?('</ul>')

            d = "<ul style='padding-left: 18px;'>" + d
            str = str + d
          else
            str = str + d
          end
        end
      end
    else
      str = desc
    end
    str2 = ""
    ds2 = str.split('<ol>') # Adding padding for <ol>
    if ds2.count > 1
      ds2.each do |d2|
        unless d2 == ""
          if d2.include?('</ol>')
            d2 = "<ol style='padding-left: 18px;'>" + d2
            str2 = str2 + d2
          else
            str2 = str2 + d2
          end
        end
      end
    else
      str2 = str
    end
    str2
  end

  def set_image
    UploadImageForUnit.perform_async @community, params[:unit_ids], params[:image_file]
    # units = @community.units.where(id: params[:unit_ids])
    # units.each do |unit|
    #   units.update(image: params[:image_file],manually_updated: true)
    # end
    # flash[:notice] = "Image is uploaded for units successfully."
    redirect_to :back, notice: "Image is uploaded for units successfully."
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
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