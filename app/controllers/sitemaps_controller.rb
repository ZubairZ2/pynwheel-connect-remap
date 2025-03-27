class SitemapsController < ApplicationController
  include AssignLocksHelper
  include CommunitiesHelper
  # include Error::ErrorHandler
  before_action :set_community
  before_action :check_community
  add_breadcrumb "Home", :root_path

  
  def map
    add_breadcrumb "Add Site Map", map_community_sitemaps_path
    @sitemap = @community.sitemap || @community.build_sitemap
  end

  def create
    @sitemap = @community.build_sitemap(sitemap_params)
    if @sitemap.save
      flash[:notice] = "Sitemap created successfully."
      redirect_to map_community_sitemaps_path
    else
      flash[:error] = @sitemap.errors.full_messages.join(',')
      render :map
    end
  end

  def update
    if @community.sitemap.update(sitemap_params)
      flash[:notice] = "Sitemap updated successfully."
      # redirect_to map_community_sitemaps_path
    else
      flash[:error] = @community.sitemap.errors.full_messages.join(',')
      # render :new
    end
  end

  def grid_overlay
    add_breadcrumb "Plot Property Map Units", plotexp_community_sitemaps_path(current_community)
    add_breadcrumb "Grid Overlay", grid_overlay_community_sitemaps_path(current_community)
    @units = @community.units.where(floorplate_id: nil).order(:building, :unit_type)
  end

  def adjust_marker_positions
    @units = @community.units.where(floorplate_id: nil).where("x_plot > ? and y_plot > ?", 0,0)
    
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
    redirect_to grid_overlay_community_sitemaps_path(@community)
  end

  def plotexp
    @community_info = Community.includes(:credential, :floorplans, { sitemap: [:amenities] }, { floorplates: [:amenities] }, { units: [:floorplate] }).find(params[:community_id])
    if @community_info.sitemap.present?
      @sitemap = @community_info.sitemap
    else
      @sitemap = @community_info.create_sitemap
    end
    
    @community_info.units.where(building: nil).update_all(building: "")

    @units = @community_info.units.visible_units.where(floorplate_id: nil).includes(:door)
    @units = @community_info.sorted_units_by_marketing_name(@units)

    @units = @units.sort_by {|obj| obj.building}
    @units_by_plotted_doors_order = @units.sort_by {|obj| obj.door.present? ? obj.door.id : obj.id}
    @floorplans = @community_info.floorplans
    @floorplans_map = @floorplans.index_by(&:provider_floorplan_id)
    @mapped_units = normalized_units_for_svg

    unless  @units.size > 0
      flash[:error] = "Please import unit data first"
    end

    @dimensions = @sitemap.is_ocr_enabled ? image_original_dimensions(@sitemap) : {}
    @map_ocr_data = @sitemap.is_ocr_enabled ? @sitemap.map_ocr_data : []

    @all_locks              =   all_locks(@community_info)
    @current_locks_provider =   existing_locks_provider(@community_info)
    @hallways               =   make_sure_one_selected_hallway(@sitemap.hallways.order("id ASC"))
    @access_points          =   @sitemap.access_points
    @unit_with_door         =   @units.map{|unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.x_plot }, door: unit.door.present? ? unit.door : {} }}}

    add_breadcrumb "Plot Property Map Units", plotexp_community_sitemaps_path
  end

  def list_amenities
    @sitemap = @community.sitemap
    @amenities = @sitemap.amenities
  end

  def plot_amenities
    add_breadcrumb "Plot Property Map Units", plotexp_community_sitemaps_path
    add_breadcrumb "Plot Property Map Amenities", plot_amenities_community_sitemaps_path(current_community) 
    
    @sitemap = @community.sitemap
    @amenities = @community.amenities.includes(:amenity_galleries)
    @mapped_amenities = normalized_amenities_for_svg
    @current_locks_provider =   existing_locks_provider(@community)
    @hallways = make_sure_one_selected_hallway(@sitemap.hallways.order("id ASC"))
    @all_locks = all_locks(@community)

    if !@sitemap.image.blank? && !@sitemap.svg_image.present?
      flash[:error] = "Kindly add Sitemap image/svg first"
      redirect_to plotexp_community_sitemaps(@community)
    end

    @amenity_with_doors = []
    @amenities_doors = @sitemap.amenities.includes(:doors, :amenity_galleries)

    @amenities_doors.each do |amenity|    # following json is created same as with unit to reuse the unit's code.
        response = amenity.ordered_doors.map { |door| { unit_info: { unit: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.id, x_plot: amenity.x_plot, y_plot: amenity.x_plot }, door: door }}}
        @amenity_with_doors << response
    end
    @amenity_with_doors = @amenity_with_doors.flatten
  end

  def plot_elevators
    add_breadcrumb "Community Elevators", community_elevators_path
    add_breadcrumb "Plot Property Map Elevators", plot_elevators_community_sitemaps_path(current_community) 
    @sitemap = @community.sitemap
    @elevators = @community.elevators
  end

  def save_sitemap_image
    file = params[:file]
    image = MiniMagick::Image.open(file.path)
  
    if image.width < 1000 && image.height < 700 && image.type != "SVG"
      flash[:error] = "Too small property map image"
      redirect_to plotexp_community_sitemaps(@community)
    else
      sitemap = Sitemap.find_by(community_id: params[:community_id], id: params[:sitemap_id])
  
      if sitemap
        sitemap.image = file # Assign the uploaded file to the uploader
        sitemap.width = image.width
        sitemap.height = image.height
        # sitemap.map_ocr_data = nil
        sitemap.is_ocr_enabled = false
  
        if sitemap.save
          render json: { status: "success" }
        else
          render json: { status: "fail" }
        end
      else
        render json: { status: "not_found" }, status: :not_found
      end
    end
  end

  def save_sitemap_svg
    file = params[:file]
    file_checksum = nil

    begin
      image = MiniMagick::Image.open(file.path)
      file_checksum = Digest::MD5.hexdigest(image.to_blob)
    rescue
      image = nil
      flash[:error] = "SVG wan unable to process. Please upload a valid SVG file."
      redirect_to plotexp_community_sitemaps(@community)
      return
    end

    if image.type != "SVG"
      flash[:error] = "Image must be of SVG type"
      redirect_to plotexp_community_sitemaps(@community)
    elsif image.width < 1000 && image.height < 700
      flash[:error] = "Too small property map image"
      redirect_to plotexp_community_sitemaps(@community)
    else
      sitemap = Sitemap.where(community_id: params[:community_id], id: params[:sitemap_id]).first
      if sitemap
        original_file = fetch_svg_by_url(get_environment_based_svg_url(sitemap))
        original_svg_image_checksum = Digest::MD5.hexdigest(original_file) if original_file.present?
        sitemap.svg_image = file
        sitemap.svg_metadata = { height: image.height, width: image.width }
        sitemap.is_ocr_enabled = false
  
        if sitemap.save
          clear_svg_plotted_units_and_amenities(sitemap, file_checksum, original_svg_image_checksum) if original_svg_image_checksum.present?

          render :json=>{"status"=>"success"}
        else
          render :json=>{"status"=>"fail"}
        end
      else
        render json: { status: "not_found" }, status: :not_found
      end
    end
  end

  private

  def normalized_units_for_svg
    @units.map do |unit|
      fetch_unit_info_struct_for_ploting(unit, @floorplans_map[unit.floorplan_id])
    end
  end

  def normalized_amenities_for_svg
    @amenities.map do |amenity|
      fetch_amenity_info_struct_for_ploting(amenity)
    end
  end

  def set_community
    @community = Community.find(params[:community_id])
  end

  def sitemap_params
    params.require(:sitemap).permit!
  end
end
