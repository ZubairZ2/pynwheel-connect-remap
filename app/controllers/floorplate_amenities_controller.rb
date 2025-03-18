class FloorplateAmenitiesController < ApplicationController
  include AssignLocksHelper
  include CommunitiesHelper
  # include Error::ErrorHandler
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
  before_action :check_community
  before_action :set_community_and_floorplate

  # def index
  #   @amenities = @floorplate.amenities.order(id: :desc)
  #   add_breadcrumb "Floor plates", community_floorplates_path(current_community)
  #   add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
  # end

  # def new
  #   @amenity = @floorplate.amenities.build
  #   add_breadcrumb "Floor plates", community_floorplates_path(current_community)
  #   add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
  #   add_breadcrumb "Add Amenity",new_community_floorplate_amenity_path
  # end

  # def edit
  #   @amenity = @floorplate.amenities.find(params[:id])
  #   add_breadcrumb "Floor plates", community_floorplates_path(current_community)
  #   add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
  #   add_breadcrumb "Edit Amenity",edit_community_floorplate_amenity_path(current_community,@floorplate,@amenity)
  # end

  # def create
  #   @floorplate.amenities.create(image: params[:src],name: params[:name])
  #   @amenities = @floorplate.amenities.order(id: :desc)
  # end

  # def update
  #   @amenity = @floorplate.amenities.find(params[:id])
  #   if @amenity.update_attributes(amenity_params)
  #     redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity updated successfully"
  #   else
  #     add_breadcrumb "Floorplates", community_floorplates_path(current_community)
  #     add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
  #     add_breadcrumb "Edit Amenity",edit_community_floorplate_amenity_path(current_community,@floorplate,@amenity)
  #     flash[:error] = @amenity.errors.full_messages.join(',')
  #     render :edit
  #   end
  # end

  # def destroy
  #   @amenity = @floorplate.amenities.find (params[:id])
  #   if @amenity.destroy
  #     redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity deleted successfully"
  #   else
  #     redirect_to community_floorplate_amenities_path(@community,@floorplate), error: @amenity.errors.full_messages.join(',')
  #   end
  # end

  def plot_amenity
    @amenity = Amenity.find (params[:amenity_id])
    @amenity.amenityable_type = "Floorplate"
    @amenity.amenityable_id = params[:floorplate_id]

		if params[:x_plot].present? && params[:y_plot].present?
			@amenity.x_plot = params[:x_plot]
			@amenity.y_plot = params[:y_plot]
		end
		@amenity.pointer_data = if params[:pointer].present?
															x_plot, y_plot, tag, id, selector = params[:pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
															{ x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector }
														else
															{}
														end
    # ts = TourStop.find_by(stop_id: @amenity.id)
    # if ts.present?
    #   ts.latitude = @amenity.x_plot
    #   ts.longitude = @amenity.y_plot
    #   ts.save
    # end
    TourStop.where(stop_id: @amenity.id).update_all(latitude: @amenity.x_plot, longitude: @amenity.y_plot)
    @amenity.floor = params[:floor]
    if @amenity.save(validate: false)
      render json: { amenity: @amenity.attributes }, status: 200
    else
      render json: {}, status: 404
    end
  end

  def plot_amenity_door                                # create or update
    amenity = @floorplate.amenities.find_by(id: params[:id])
    if amenity.present?
      if params[:door_id].present? and params[:door_id].to_i != 0
        door = amenity.ordered_doors.find params[:door_id]
        status = "updated"
      else
        door = amenity.ordered_doors.build
        status = "created"
      end
      door.update_attributes(community_id: @community.id, x_plot: params[:x_plot], y_plot: params[:y_plot])
      render json: {amenity: amenity, door: door.reload, status: status, success: true}
    else
      render json: {unit: {}, door: {}, status: nil, success: false}
    end
  end

  def load_amenity_door_lock
    @amenity = @floorplate.amenities.find params[:id]
    @door = @amenity.ordered_doors.find params[:door_id]
  end

  def plot_amenities
    @floor = params[:floor] if params[:floor].present?
    add_breadcrumb "Floorplates", community_floorplates_path(current_community)
    add_breadcrumb "Plot Amenities", plot_amenities_community_floorplate_amenities_path(@community, @floorplate)

    @amenities              = @community.amenities.includes(:amenity_galleries)
    @mapped_amenities       = normalized_amenities_for_svg
    @current_locks_provider = existing_locks_provider(@community)
    @hallways               = make_sure_one_selected_hallway(@floorplate.hallways)
    @all_locks              = all_locks(@community)

    @amenity_with_doors = []

    @amenities_doors        = @floorplate.amenities.includes(:doors)

    @amenities_doors.each do |amenity|    # following json is created same as with unit to reuse the unit's code.
        response = amenity.ordered_doors.map { |door| { unit_info: { unit: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.id, x_plot: amenity.x_plot, y_plot: amenity.x_plot }, door: door }}}
        @amenity_with_doors << response
    end
    @amenity_with_doors = @amenity_with_doors.flatten

    @all_locks = all_locks(@community)

    if @floorplate.image.blank? 
      flash[:error] = "Kindly add floor plate image first"
      redirect_to community_floorplates_path(@community)
    end
  end

  def remove_amenities_plot
    svg_deletion = params[:svg_deletion].to_s == "true"
    new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }

    @floorplate.amenities.each do |amenity|
      amenity.assign_attributes(new_attributes)
      amenity.save(validate: false)
    end

    url_params = [@community, @floorplate]
    url_params << { floor: params[:floor] } if params[:floor].present?
    redirect_to plot_amenities_community_floorplate_amenities_path(*url_params), notice: "All plots have been deleted successfully."
  end

  def remove_amenity
    @amenity = Amenity.find params[:id]
    amenities = @floorplate.amenities

    svg_deletion = params[:svg_deletion].to_s == "true"
    new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }

    amenities = @amenity.filter_amenities_for_plot_removal(amenities, svg_deletion)
    amenities.each do |amenity|
      amenity.assign_attributes(new_attributes)
      amenity.save(validate: false)
      ts = TourStop.where(stop_id: amenity.id)
      ts.destroy_all if ts.present?
      Path.where(:map_path_to_id => amenity.id).destroy_all rescue ""
      Path.where(:map_path_from_id => amenity.id).destroy_all rescue ""
    end

    url_params = [@community, @floorplate]
    url_params << { floor: @amenity.floor } if @amenity.floor.present?
    redirect_to plot_amenities_community_floorplate_amenities_path(*url_params), notice: "Amenity plot has been deleted successfully."
  end

  private

  def normalized_amenities_for_svg
    @amenities.svg_pointed.map do |amenity|
      fetch_amenity_info_struct_for_ploting(amenity)
    end
  end

  def set_community_and_floorplate
    @community = Community.find params[:community_id]
    @floorplate = Floorplate.find params[:floorplate_id]
  end

  def amenity_params
    params.require(:amenity).permit!
  end
end