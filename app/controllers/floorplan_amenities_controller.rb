class FloorplanAmenitiesController < ApplicationController
  # include Error::ErrorHandler
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
  before_action :check_community
  before_action :set_community_and_floorplan

  def index
    @amenities = @floorplan.amenities.order(id: :desc)
    add_breadcrumb "Floor plans", community_floorplans_path(current_community)
    add_breadcrumb "Manage Images", community_floorplan_amenities_path(current_community,@floorplan)
  end

  def new
    @amenity = @floorplan.amenities.build
    add_breadcrumb "Floor plans", community_floorplans_path(current_community)
    add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
    add_breadcrumb "Add Amenity",new_community_floorplan_amenity_path
  end

  def edit
    @amenity = @floorplan.amenities.find(params[:id])
    add_breadcrumb "Floor plans", community_floorplans_path(current_community)
    add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
    add_breadcrumb "Edit Amenity",edit_community_floorplan_amenity_path(current_community,@floorplan,@amenity)
  end

  def create
    amenity = @floorplan.amenities.create(image: params[:src], name: params[:name])
    amenity.update!(floorplan_amenity_id: amenity.id)
    @amenities = @floorplan.amenities.order(id: :desc)
    floorplan_units = Unit.all.where(floorplan_id: @floorplan.provider_floorplan_id) rescue nil
    if floorplan_units.present?
      FloorplanAmenityImagesJob.perform_async @floorplan, params[:src],params[:name],amenity, params[:community_id]
    end
  end

  def update
    @amenity = @floorplan.amenities.find(params[:id])
    if @amenity.update_attributes(amenity_params)
      FloorplanAmenitiesService.new(@floorplan, @amenity, current_community).update_description_and_name()
      redirect_to community_floorplan_amenities_path(@community, @floorplan), notice: "Amenity updated successfully"
    else
      add_breadcrumb "Floor plans", community_floorplans_path(current_community)
      add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
      add_breadcrumb "Edit Amenity",edit_community_floorplan_amenity_path(current_community,@floorplan,@amenity)
      flash[:error] = @amenity.errors.full_messages.join(',')
      render :edit
    end
  end

  def upload_floorplan_amenity_image
    @amenity = @floorplan.amenities.find_by(id: params[:id])
    @amenity&.update(image: params[:src])
    FloorplanAmenitiesService.new(@floorplan, @amenity, current_community).update_image(params[:src])
    redirect_to community_floorplan_amenities_path(@community, @floorplan), notice: "Amenity image updated successfully"
  end

  def destroy
    @amenity = @floorplan.amenities.find(params[:id])
    if @amenity.destroy
      DeleteFloorplanAmenityImagesJob.perform_async @floorplan, params[:id], params[:community_id]
      redirect_to community_floorplan_amenities_path(@community, @floorplan), notice: "Amenity deleted successfully"
    else
      redirect_to community_floorplan_amenities_path(@community, @floorplan), error: @amenity.errors.full_messages.join(',')
    end
  end

  def plot_amenity
    @amenity = Amenity.find (params[:amenity_id])

		if params[:x_plot].present? && params[:y_plot].present?
			@amenity.x_plot = params[:x_plot]
			@amenity.y_plot = params[:y_plot]
		end
    if params[:pointer].present?
      x_plot, y_plot, tag, id, selector = params[:pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
			@amenity.pointer_data = { x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector }
    end

    if @amenity.save(validate: false)
      @plot_amenity_for_units = Amenity.where(floorplan_amenity_id:  @amenity.id)
      plot_amenity_on_unit = "True"
      FloorplanAmenityImagesJob.perform_async(@plot_amenity_for_units, plot_amenity_on_unit ,params[:x_plot],params[:y_plot], nil)
      render json: {amenity: @amenity}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def plot_amenities
    add_breadcrumb "Floor plans", community_floorplans_path(current_community)
    add_breadcrumb "Plot Images", plot_amenities_community_floorplan_amenities_path(@community,@floorplan)
    @sitemap = @floorplan
    @amenities = @floorplan.amenities
    if @floorplan.image.blank? 
      flash[:error] = "Kindly add floor plan image first"
      redirect_to community_floorplans_path(@community)
    end
  end

  def remove_amenities_plot
    svg_deletion = params[:svg_deletion].to_s == "true"
    new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }

    @floorplan.amenities.each do |amenity| 
      FloorplanAmenitiesService.new(@floorplan, amenity, @community).reset_plotting(svg_deletion)
    end
    @floorplan.amenities.update_all(new_attributes)
    
    redirect_to plot_amenities_community_floorplan_amenities_path(@community, @floorplan), notice: "All plots have been deleted successfully."
  end

  def remove_amenity
    @amenity = Amenity.find params[:id]
    amenities = @floorplan.amenities

    svg_deletion = params[:svg_deletion].to_s == "true"
    new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }

    amenities = @amenity.filter_amenities_for_plot_removal(amenities, svg_deletion)
    amenities.each do |amenity|
      FloorplanAmenitiesService.new(@floorplan, amenity, @community).reset_plotting(svg_deletion)
    end
    amenities.update_all(new_attributes)

    redirect_to plot_amenities_community_floorplan_amenities_path(@community,@floorplan), notice: "Image plot have been deleted successfully."
  end

  private

  def set_community_and_floorplan
    @community = Community.find params[:community_id]
    @floorplan = Floorplan.find params[:floorplan_id]
  end

  def amenity_params
    params.require(:amenity).permit!
  end
end