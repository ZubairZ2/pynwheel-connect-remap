class NeighborhoodsController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Neighborhood"
  before_action :set_community

	def index
		@neighborhood = @community.neighborhood || @community.create_neighborhood
	end

	def create
		@neighborhood = @community.build_neighborhood(neighborhood_params)
    if @neighborhood.save
      flash[:notice] = "Neighborhood created successfully."
      redirect_to community_neighborhoods_path(@community)
    else
      flash[:error] = @neighborhood.errors.full_messages.join(',')
      render :index
    end
	end

	def update
		@neighborhood = @community.neighborhood
    respond_to do |format|
      if @neighborhood.update(neighborhood_params)
        #flash[:notice] = "Neighborhood updated successfully."
        #redirect_to community_neighborhoods_path(@community)
        alert_message = '<div class="alert alert-success">Neighborhood updated successfully.</div>'
        format.js {render js: "$('#flash-message').html('#{alert_message}'); setTimeout(function() {$('.alert').fadeOut('slow');}, 10000);"}
      else
        #flash[:error] = @neighborhood.errors.full_messages.join(',')
        #render :index
        message = '<div class="alert alert-warning">'+@neighborhood.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
	end

	private

	def set_community
		@community = Community.find params[:community_id]
	end

	def neighborhood_params
    params.require(:neighborhood).permit(:address, :latitude, :longitude, :radius, :zoom, :show_neighborhood, :neighborhood_name, category:[])
  end
end