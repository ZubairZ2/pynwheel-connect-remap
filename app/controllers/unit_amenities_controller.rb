class UnitAmenitiesController < ApplicationController
  # include Error::ErrorHandler
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
  # before_action :check_community
  before_action :set_community_and_unit

  def index
    @amenities = @unit.amenities.order(:sort)
    # add_breadcrumb "Units", community_unit_path(current_community)
    # add_breadcrumb "Manage Images", community_unit_amenities_path(current_community,@unit)
    # @community = Community.find params[:community_id]
    # @unit = Unit.find params[:unit_id]
  end

  def edit
    @amenity = @unit.amenities.find(params[:id])
    add_breadcrumb "Floor plans", community_unit_path(current_community)
    add_breadcrumb "Amenities", community_unit_amenities_path(current_community,@unit)
    add_breadcrumb "Edit Amenity",edit_community_unit_amenity_path(current_community,@unit,@amenity)
  end

  def update
    @amenity = @unit.amenities.find(params[:id])
    if @amenity.update(amenity_params)
      Amenity.where('id != ? AND mass_upload_id = ?', @amenity.id, @amenity.mass_upload_id).update_all(name: amenity_params[:name], description: amenity_params[:description]) if @amenity.mass_upload_id.present?
      redirect_to edit_community_unit_path(@community,@unit), notice: "Unit amenity updated successfully"
    else
      add_breadcrumb "Units", community_unit_path(current_community)
      add_breadcrumb "Amenities", community_unit_amenities_path(current_community,@unit)
      add_breadcrumb "Edit Amenity",edit_community_unit_amenity_path(current_community,@unit,@amenity)
      flash[:error] = @amenity.errors.full_messages.join(',')
      render 'units/edit'
    end
  end
  
  def plot_amenity
    @amenity = Amenity.find (params[:amenity_id])
    @amenity.amenityable_type = "Unit"
    @amenity.amenityable_id = params[:unit_id]
    @amenity.x_plot = params[:x_plot]
    @amenity.y_plot = params[:y_plot]
    if @amenity.save(validate: false)
      render json: {amenity: @amenity}, status: 200
      Amenity.where('id != ? AND mass_upload_id = ?', @amenity.id, @amenity.mass_upload_id).update_all(x_plot: params[:x_plot], y_plot: params[:y_plot]) if @amenity.mass_upload_id.present?
    else
      render json: {}, status: 404
    end
  end
  
  def create
    if params[:image_id] == '0'
      @unit.amenities.create(image: params[:src],name: params[:name])
    else
      @unit.amenities.create(image: params[:src],name: params[:name], mass_upload_id: params[:image_id])
    end
    @amenities = @unit.amenities.order(id: :desc)
  end
  
  def plot_amenities
    add_breadcrumb "Units", community_units_path(current_community)
    add_breadcrumb "Plot Unit Images", plot_amenities_community_unit_amenities_path(@community,@unit)
    @sitemap = @unit
    @amenities = @unit.amenities
    @floorplan = Floorplan.where(provider_floorplan_id: @unit.floorplan_id,community_id: @community.id).first

    @tour_amenity_array =  TourStop.where(tour_id: @community.community_tour.id,stop_type: "amenity").map{|x| x.stop_id if x.present?} if @community.community_tour.present?
  end

  def remove_amenities_plot
    @unit.amenities.each do |amenity|
      amenity.x_plot = 0
      amenity.y_plot = 0
      amenity.save(validate: false)
    end
    redirect_to plot_amenities_community_unit_amenities_path(@community,@unit), notice: "All plots have been deleted successfully."
  end

  def remove_amenity
    @amenity = Amenity.find params[:id]
    amenities = @unit.amenities.where(x_plot: @amenity.x_plot, y_plot: @amenity.y_plot)
    amenities.each do |amenity|
      amenity.x_plot = 0
      amenity.y_plot = 0
      amenity.save(validate: false)
    end
    redirect_to plot_amenities_community_unit_amenities_path(@community,@unit), notice: "Amenity plot have been deleted successfully."
  end
  
  def add_description
    @amenity = Amenity.find params[:id]
    redirect_to plot_amenities_community_unit_amenities_path(@community,@unit)
  end
  
  def save_description
    # @community = Community.find params[:community_id]
    # @unit = Unit.find params[:unit_id]
    @amenity = Amenity.find params[:id]
    @amenity.description = params[:description]
    if @amenity.save
      Amenity.where('id != ? AND mass_upload_id = ?', @amenity.id, @amenity.mass_upload_id).update_all(description: params[:description]) if @amenity.mass_upload_id.present?
      redirect_to plot_amenities_community_unit_amenities_path(@community,@unit),notice: "Amenity description updated successfully."
    else
      redirect_to plot_amenities_community_unit_amenities_path(@community,@unit)
    end
  end

  def delete_unit_plot
    # @community = Community.find params[:community_id]
    # @unit = Unit.find params[:unit_id]
    @amenity = Amenity.find params[:id]
    @amenity.x_plot = 0
    @amenity.y_plot = 0
    @amenity.save
    redirect_to plot_amenities_community_unit_amenities_path(@community,@unit), notice: "Amenity deleted successfully"
  end
  
  def destroy
    @amenity = @unit.amenities.find (params[:id])
    if @amenity.destroy
      redirect_to edit_community_unit_path(@community,@unit), notice: "Unit amenity deleted successfully"
    else
      redirect_to edit_community_unit_path(@community,@unit), error: @amenity.errors.full_messages.join(',')
    end
  end

  private

  def set_community_and_unit
    @community = Community.find params[:community_id]
    @unit = Unit.find params[:unit_id]
  end

  def amenity_params
    params.require(:amenity).permit!
  end
  
end