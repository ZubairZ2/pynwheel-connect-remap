class AmenitiesController < ApplicationController
  before_action :authenticate_user!
  add_breadcrumb "Home", :root_path

  def index
    @amenities = current_community.amenities.order(id: :desc)
    add_breadcrumb "Amenities", community_amenities_path(current_community)
  end

  def create
    current_community.amenities.create(image: params[:src],name: params[:name])
    @amenities = current_community.amenities.order(id: :desc)
  end

  def edit
    @amenity = current_community.amenities.find (params[:id])
  end

  def update
    @amenity = current_community.amenities.find(params[:id])
    if @amenity.update_attributes(amenity_params)
      redirect_to community_amenities_path(current_community), notice: "Amenity updated successfully"
    else
      redirect_to community_amenities_path(current_community), error: @amenity.errors.full_messages.join(',')
    end
  end

  def destroy
    @amenity = current_community.amenities.find (params[:id])
    if @amenity.destroy
      redirect_to community_amenities_path(current_community), notice: "Amenity deleted successfully"
    else
      redirect_to community_amenities_path(current_community), error: @amenity.errors.full_messages.join(',')
    end
  end

  private

  def amenity_params
    params.require(:amenity).permit!
  end

end