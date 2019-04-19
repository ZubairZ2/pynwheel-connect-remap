class NeighborhoodsController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Neighborhood Settings"
  before_action :check_community
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
        message = '<div class="alert alert-danger">'+@neighborhood.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
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