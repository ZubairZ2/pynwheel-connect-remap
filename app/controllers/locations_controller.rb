class LocationsController < ApplicationController
  # include Error::ErrorHandler
  before_action :set_community
  before_action :check_community

	add_breadcrumb "Home", :root_path
	add_breadcrumb "Neighborhood", :community_neighborhoods_path
  add_breadcrumb "Locations"
  
	def index
		@locations = @community.neighborhood.locations
	end

	def new
    @location = @community.neighborhood.locations.new
  end

  def create
    @location = @community.neighborhood.locations.new(location_params)
    if @location.save
      flash[:notice] = "Location created successfully."
    else
      flash[:error] = @location.errors.full_messages.join(',')
    end
    redirect_to community_neighborhood_locations_path(@community,@neighborhood)
  end

  def edit
    @location = @community.neighborhood.locations.find(params[:id])
  end

  def update
    @location = @community.neighborhood.locations.find(params[:id])
    if @location.update_columns(location_params)
      flash[:notice] = "Location updated successfully."
    else
      flash[:error] = @location.errors.full_messages.join(',')
    end
    redirect_to community_neighborhood_locations_path(@community,@neighborhood)
  end

  def destroy
    @location = @community.neighborhood.locations.find(params[:id])
    if @location.destroy
      flash[:notice] = "Location deleted successfully."
    else
      flash[:error] = @location.errors.full_messages.join(',')
    end
    redirect_to community_neighborhood_locations_path(@community,@neighborhood)
  end

	private

	def set_community
		@community = Community.find params[:community_id]
    @neighborhood = @community.neighborhood
	end

	def location_params
    params.require(:location).permit!
  end
end