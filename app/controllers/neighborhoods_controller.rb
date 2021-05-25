class NeighborhoodsController < ApplicationController
  # include Error::ErrorHandler
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Neighborhood Settings"
  before_action :check_community
  before_action :set_community

	def index
		@neighborhood = @community.neighborhood || @community.create_neighborhood
    @appVersion = AppVersion.first
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
    begin
      @appVersion = AppVersion.first
      if params[:counter_limit].present? && !(@appVersion.counter_limit == params[:counter_limit])
        @appVersion.counter_limit = params[:counter_limit]
      end
      if params[:neighborhood_counter].present? && !(@appVersion.neighborhood_counter == params[:neighborhood_counter])
        @appVersion.neighborhood_counter = params[:neighborhood_counter]
      end
    rescue => ex
    end
    @appVersion.save
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
        message = '<div class="alert alert-danger">'+@neighborhood.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
  end

	private

	def set_community
		@community = Community.find params[:community_id]
	end

	def neighborhood_params
    params.require(:neighborhood).permit(:address, :latitude, :longitude, :radius, :zoom, :show_neighborhood, :display_neighborhood_on_homepage, :neighborhood_name,:listing,category:[])
  end
end