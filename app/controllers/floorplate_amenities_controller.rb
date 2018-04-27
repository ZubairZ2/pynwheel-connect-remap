class FloorplateAmenitiesController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
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
  #     add_breadcrumb "Floor plates", community_floorplates_path(current_community)
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
    @amenity.x_plot = params[:x_plot]
    @amenity.y_plot = params[:y_plot]
    if @amenity.save(validate: false)
      render json: {amenity: @amenity}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def plot_amenities
    add_breadcrumb "Floor plates", community_floorplates_path(current_community)
    add_breadcrumb "Plot Amenities", plot_amenities_community_floorplate_amenities_path(@community,@floorplate)
    @sitemap = @floorplate
    @amenities = @community.amenities
    if @floorplate.image.blank? 
      flash[:error] = "Kindly add floor plate image first"
      redirect_to community_floorplates_path(@community)
    end
  end

  def remove_amenities_plot
    @floorplate.amenities.each do |amenity|
      amenity.x_plot = 0
      amenity.y_plot = 0
      amenity.amenityable_type = nil
      amenity.amenityable_id = nil
      amenity.save(validate: false)
    end
    redirect_to plot_amenities_community_floorplate_amenities_path(@community,@floorplate), notice: "All plots have been deleted successfully."
  end

  def remove_amenity
    @amenity = Amenity.find params[:id]
    amenities = @floorplate.amenities.where(x_plot: @amenity.x_plot, y_plot: @amenity.y_plot)
    amenities.each do |amenity|
      amenity.x_plot = 0
      amenity.y_plot = 0
      amenity.amenityable_type = nil
      amenity.amenityable_id = nil
      amenity.save(validate: false)
    end
    redirect_to plot_amenities_community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity plot have been deleted successfully."
  end

  private

  def set_community_and_floorplate
    @community = Community.find params[:community_id]
    @floorplate = Floorplate.find params[:floorplate_id]
  end

  def amenity_params
    params.require(:amenity).permit!
  end
end