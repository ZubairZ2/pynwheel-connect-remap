class FloorplatesController < ApplicationController
  include AssignLocksHelper
  include CommunitiesHelper
  include Connect::InventoryJson
  # include Error::ErrorHandler
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
  before_action :check_community
  before_action :set_floorplate, only: [:edit, :update, :destroy]
  skip_before_action :load_tour_users_chats, only: [:floatplate_images]

  def index
    # Pynwheel Connect asks for JSON; an unknown property id is a 404 there
    # rather than the NoMethodError the HTML path has always raised.
    return head :not_found if request.format.json? && current_community.nil?

    @floorplates = current_community.floorplates.order(id: :desc)
    # Pynwheel Connect's read-only Property Inventory.
    return render_connect_floorplates if request.format.json?

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

    if floorplate_params[:image].blank? && floorplate_params[:svg_image].blank?
      flash[:error] = "Image or SVG must be present."
      render :new and return
    end

    upload_svg_image(floorplate_params[:svg_image])

    # Handle raster images (PNG, JPG, etc)
    if floorplate_params[:image].present?
      image_file = floorplate_params[:image]
      begin
        image = MiniMagick::Image.open(image_file.path)

        if image.width < 1000 && image.height < 700 && image.type != "SVG"
          flash[:error] = "Too small property map image"
          render :new and return
        else
          @floorplate.width  = (image.width  rescue 0)
          @floorplate.height = (image.height rescue 0)
        end
      rescue MiniMagick::Error => e
        Rails.logger.error "MiniMagick failed: #{e.message}"
        flash[:error] = "Invalid image file."
        render :new and return
      end
    end

    if @floorplate.save
      flash[:notice] = "Floorplate created successfully."
      redirect_to community_floorplates_path(current_community)
    else
      add_breadcrumb "Floor plates", community_floorplates_path(current_community)
      add_breadcrumb "Add Floor plate", new_community_floorplate_path(current_community)
      flash[:error] = @floorplate.errors.full_messages.join(',')
      render :new and return
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
      render json: { elevator: @elevator }, status: 200
    else
      render json: {}, status: 404
    end
  end

  def edit
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    add_breadcrumb "Floorplate Details", edit_community_floorplate_path(current_community, @floorplate)
  end

  def select_floor
    @community = Community.find params[:community_id]
    @floorplate = Floorplate.find params[:floorplate_id]
    if params[:floor].present?
      redirect_to plot_amenities_community_floorplate_amenities_path(current_community, @floorplate, floor: params[:floor])
    end
  end

  def select_many_floors
    @community = Community.find params[:community_id]
    @floorplate = Floorplate.find params[:floorplate_id]
  end

  def update
    if floorplate_params[:name] != @floorplate.name
      @floorplate.name_is_updated = true
    end
    if floorplate_params[:building] != @floorplate.building
      @floorplate.building_is_updated = true
    end

    upload_svg_image(floorplate_params[:svg_image])

    if floorplate_params[:image].present?
      image = MiniMagick::Image.open(floorplate_params[:image].path)
      if image.width < 1000 && image.height < 700 && image.type != "SVG"
        flash[:error] = "Too small property map image"
        render :new and return
      else
        @floorplate.width = (image.width rescue 0)
        @floorplate.height = (image.height rescue 0)
      end
    end

    @floorplate.map_ocr_data = nil
    @floorplate.is_ocr_enabled = false
    
    if floorplate_params[:manual_override] == "true"
      if @floorplate.update(floorplate_params)
        revalidate_svg_plots

        flash[:notice] = "Floorplate updated successfully."
        PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "update", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")

        redirect_to community_floorplates_path(current_community) and return
      else
        add_breadcrumb "Floorplates", community_floorplates_path(current_community)
        add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community, @floorplate)
        flash[:error] = @floorplate.errors.full_messages.join(',')
        render :edit and return
      end
    else
      unless (floorplate_params[:name] != @floorplate.name) || (floorplate_params[:building] != @floorplate.building)
        if @floorplate.update(floorplate_params)
          revalidate_svg_plots
  
          flash[:notice] = "Floorplate updated successfully."
          #PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "update", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")

          redirect_to community_floorplates_path(current_community) and return
        else
          add_breadcrumb "Floorplates", community_floorplates_path(current_community)
          add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community, @floorplate)
          flash[:error] = @floorplate.errors.full_messages.join(',')
          render :edit and return
        end
      else
        add_breadcrumb "Floorplates", community_floorplates_path(current_community)
        add_breadcrumb "Edit Floorplate", edit_community_floorplate_path(current_community, @floorplate)
        flash[:error] = "Please set manual override field first"
        render :edit and return
      end
    end
  end

  def destroy
    #PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "destroy", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")

    @floorplate.destroy
    flash[:notice] = "Floorplate deleted successfully."
    redirect_to community_floorplates_path(current_community)
  end

  def grid_overlay
    @floorplate = Floorplate.find params[:floorplate_id]
    @units = @floorplate.units.order(:building, :unit_type)
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    add_breadcrumb "Grid Overlay", community_floorplate_grid_overlay_path(current_community, @floorplate)
  end

  def adjust_marker_positions
    @floorplate = Floorplate.find params[:floorplate_id]
    @units = @floorplate.units.where("x_plot > ? and y_plot > ?", 0, 0).order(:building, :unit_type)

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
    redirect_to community_floorplate_grid_overlay_path(current_community, @floorplate)
  end

  def plotexp
    @community_info = Community.includes(:credential, :floorplans, { sitemap: [:amenities] }, { floorplates: [:amenities] }, { units: [:floorplate] }).find(params[:community_id])
    @floorplate = @community_info.floorplates.find params[:floorplate_id]
    @floors = @floorplate.floors

    unless @community_info.units.size > 0
      flash[:error] = "Please import unit data first"
      return
    end
    
    @community_info.units.where(building: nil).update_all(building: "")

    @floorplate_units = @floorplate.fetch_units.includes(:door)
    @floorplate_units = @community_info.sorted_units_by_field_key(@floorplate_units, 'marketing_name')
    @floorplate_units = @community_info.sorted_units_by_field_key(@floorplate_units, 'floor')
    @floorplate_units = @community_info.sorted_units_by_field_key(@floorplate_units, 'building')
    @floorplate_units = @community_info.sorted_units_by_field_key(@floorplate_units, 'voyager_property_code', 'property_id')

    @floorplate_units_by_plotted_doors_order = @floorplate_units.sort_by {|obj| obj.door.present? ? obj.door.id : obj.id}

    @floorplans = @community_info.floorplans
    @floorplans_map = @floorplans.index_by(&:provider_floorplan_id)
    @mapped_units = normalized_units_for_svg
    
    @map_ocr_data = @floorplate.is_ocr_enabled ? @floorplate.map_ocr_data : []
    @dimensions = @floorplate.is_ocr_enabled ? image_original_dimensions(@floorplate) : {}
    
    @test_units = @floorplate_units.to_json

    @current_locks_provider = existing_locks_provider(@community_info)
    @all_locks = all_locks(@community_info)
    @hallways = make_sure_one_selected_hallway(@floorplate.hallways.order("id ASC"))
    @access_points = @floorplate.access_points
    @unit_with_door = @floorplate_units.map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } }

    add_breadcrumb "Floor plates", community_floorplates_path(current_community)
    add_breadcrumb "Plot Floor Plate Units", community_floorplate_plotexp_path(current_community, @floorplate)
  end

  def ajax_path_draw_on_floorplate
    unit = @community.units.where(provider_unit_id: params[:id])
    if unit.present?
      #unit.first.update(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      unit = unit.first
      unit.x_plot = params[:x_plot]
      unit.y_plot = params[:y_plot]
      unit.floorplate_id = params[:floorplate_id]
      unit.save(validate: false)
      ts = TourStop.find_by(stop_id: unit.id)
      if ts.present?
        ts.latitude = unit.x_plot
        ts.longitude = unit.y_plot
        ts.save
      end
      render json: { unit: unit }, status: 200
    else
      render json: {}, status: 404
    end
  end

  def floatplate_images
    floorplate = Floorplate.find params[:floorplate_id]
    if floorplate.image_url.present?
      render json: { image_src: floorplate.image_url }, status: 200
    else
      render json: { image_src: nil }, status: 400
    end
  end

  private

  def render_connect_floorplates
    community = current_community
    tour = community.community_tour
    sitemap = community.sitemap

    render_connect_inventory(
      Connect::FloorplateSerializer.collection(@floorplates, community, base_url: request.base_url),
      community,
      extra: {
        map_type: community.has_floorplates? ? "floorplates" : "sitemap",
        svg_mode: community.enable_svg_mode.present?,
        tour_stop_count: tour ? tour.tour_stops.count : 0,
        shared_background: Connect::UploadUrl.file(community, :background_svg_image, request.base_url),
        sitemap: sitemap && {
          id: sitemap.id,
          image: Connect::UploadUrl.file(sitemap, :image, request.base_url),
          svg: Connect::UploadUrl.file(sitemap, :svg_image, request.base_url),
          width: sitemap.width,
          height: sitemap.height
        }
      }
    )
  end

  def upload_svg_image(svg_file)
    return unless svg_file.present?

    unless svg_file.content_type == "image/svg+xml"
      return render_svg_error("SVG section image must be of SVG type.")
    end

    doc = parse_svg(svg_file)
    return unless doc

    # Held for revalidate_svg_plots, which runs after the floorplate saves.
    @uploaded_svg_doc = doc

    width  = doc.root["width"].to_i
    height = doc.root["height"].to_i

    # if width < 1000 && height < 700
    #   return render_svg_error("Too small property map image")
    # end

    @floorplate.svg_metadata = { width: width, height: height }
  end

  # Drops plotting only for the shapes that are missing from the newly uploaded
  # artwork. Previously this compared file checksums, but the two locals it read
  # were never assigned, so floorplate plotting was never revalidated at all.
  def revalidate_svg_plots
    return unless @uploaded_svg_doc

    SvgPlotRevalidator.call(current_community, @uploaded_svg_doc, floorplate: @floorplate)
  end

  def parse_svg(svg_file)
    Nokogiri::XML(File.read(svg_file.path))
  rescue => e
    Rails.logger.error "SVG parse failed: #{e.message}"
    render_svg_error("Invalid SVG file.")
    nil
  end

  def render_svg_error(message)
    flash[:error] = message
    render :new
  end

  def normalized_units_for_svg
    @floorplate_units.map do |unit|
      fetch_unit_info_struct_for_ploting(unit, @floorplans_map[unit.floorplan_id])
    end
  end

  def floorplate_params
    params.require(:floorplate).permit!
  end

  def set_floorplate
    @floorplate = Floorplate.find params[:id]
  end
end
