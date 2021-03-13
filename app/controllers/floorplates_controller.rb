class FloorplatesController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :check_community
  before_action :authenticate_user!
  before_action :set_floorplate, only: [:edit,:update,:destroy]
  skip_before_action :load_tour_users_chats, only: [:floatplate_images]
  
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
    unless params[:floorplate][:image].present?
      flash[:error] = "Image not present."
      render :new
    else
      image = MiniMagick::Image.open(params[:floorplate][:image].path)
      if image.width < 1000 && image.height < 700 && image.type != "SVG"
        flash[:error] = "Too small property map image"
        render :new
      else
        @floorplate.width = (image.width rescue 0)
        @floorplate.height = (image.height rescue 0)
        if @floorplate.save
          flash[:notice] = "Floorplate created successfully."
          PaperTrail::Version.create(item_type: "Floorplate",item_id: @floorplate.id,event: "create",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")
          redirect_to community_floorplates_path(current_community)
          PaperTrail::Version.create(item_type: "Floorplate",item_id: @floorplate.id,event: "create",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")
        else
          add_breadcrumb "Floor plates", community_floorplates_path(current_community)
          add_breadcrumb "Add Floor plate", new_community_floorplate_path(current_community)
          flash[:error] = @floorplate.errors.full_messages.join(',')
          render :new
        end
      end
    end

  end

  def plot_elevator

    @elevator = Elevator.find_by_id(params[:elevator_id])
    @elevator.x_plot = params[:x_plot]
    @elevator.y_plot = params[:y_plot]

    # TODO - this SHOULD BE FIXED 
    # this floorplate_id is being used for both sitemap_id 
    @elevator.sitemap_id = params[:floorplate_id]
    if @elevator.save(validate: false)
      render json: {elevator: @elevator}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def edit
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    add_breadcrumb "Floorplate Details", edit_community_floorplate_path(current_community,@floorplate)
  end
  def select_floor
    @community = Community.find params[:community_id]
    @floorplate = Floorplate.find params[:floorplate_id]
    if params[:floor].present?
      redirect_to plot_amenities_community_floorplate_amenities_path(current_community,@floorplate,floor: params[:floor])
    end
  end

  def update
    if params[:floorplate][:name] != @floorplate.name
      @floorplate.name_is_updated = true
    end
    if params[:floorplate][:building] != @floorplate.building
      @floorplate.building_is_updated = true
    end
    image = MiniMagick::Image.open(params[:floorplate][:image].path) if params[:floorplate][:image].present?
    if image.present? && image.width < 1000 && image.height < 700 && image.type != "SVG"
      flash[:error] = "Too small property map image"
      render :edit
    else
      @floorplate.width = (image.width rescue 0)
      @floorplate.height = (image.height rescue 0)
      if params[:floorplate][:manual_override] == "true"
        if @floorplate.update(floorplate_params)
          flash[:notice] = "Floorplate updated successfully."
          PaperTrail::Version.create(item_type: "Floorplate",item_id: @floorplate.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")

          redirect_to community_floorplates_path(current_community)
        else
          add_breadcrumb "Floorplates", community_floorplates_path(current_community)
          add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community,@floorplate)
          flash[:error] = @floorplate.errors.full_messages.join(',')
          render :edit
        end
      else
        unless (params[:floorplate][:name] != @floorplate.name) || (params[:floorplate][:building] != @floorplate.building)
          if @floorplate.update(floorplate_params)
            flash[:notice] = "Floorplate updated successfully."
            PaperTrail::Version.create(item_type: "Floorplate",item_id: @floorplate.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")

            redirect_to community_floorplates_path(current_community)
          else
            add_breadcrumb "Floorplates", community_floorplates_path(current_community)
            add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community,@floorplate)
            flash[:error] = @floorplate.errors.full_messages.join(',')
            render :edit
          end
        else
          add_breadcrumb "Floorplates", community_floorplates_path(current_community)
          add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community,@floorplate)
          flash[:error] = "Please set manual override field first"
          render :edit
        end
      end
    end

  end

  def destroy
    PaperTrail::Version.create(item_type: "Floorplate",item_id: @floorplate.id,event: "destroy",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")

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
      return
    end

    @community_units = @floorplate.fetch_units.includes(:door, :remote_locks, :latch_locks, :zerv_locks)
    @unit_with_door = @community_units.map{|unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.x_plot }, door: unit.door.present? ? unit.door : {} }}}
    add_breadcrumb "Floor plates", community_floorplates_path(current_community)
    add_breadcrumb "Plot Floor Plate Units", community_floorplate_plotexp_path(current_community,@floorplate)
  end
  
  def ajax_path_draw_on_floorplate
    unit = @community.units.where(provider_unit_id: params[:id])
    if unit.present?
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      unit = unit.first
      unit.x_plot = params[:x_plot]
      unit.y_plot = params[:y_plot]
      unit.floorplate_id = params[:floorplate_id]
      unit.save(validate: false)
      ts = TourStop.find_by(stop_id: unit.id)
      if ts.present?
        ts.latitude  = unit.x_plot
        ts.longitude = unit.y_plot
        ts.save
      end
      render json: {unit: unit}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def floatplate_images
    floorplate = Floorplate.find params[:floorplate_id]
    if floorplate.image_url.present?
      render json: {image_src: floorplate.image_url}, status: 200
    else
      render json: {image_src: nil}, status: 400
    end
  end
  private

  def floorplate_params
    params.require(:floorplate).permit!
  end

  def  set_floorplate
    @floorplate = Floorplate.find params[:id]
  end
end