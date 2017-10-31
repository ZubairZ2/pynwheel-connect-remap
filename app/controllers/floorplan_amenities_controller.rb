class FloorplanAmenitiesController < ApplicationController
	before_action :authenticate_user!
	before_action :set_community_and_floorplan

	def index
    @amenities = @floorplan.amenities
	end

	def new
		@amenity = @floorplan.amenities.build
	end

	def edit
		@amenity = @floorplan.amenities.find(params[:id])
	end

	def create
		@amenity = @floorplan.amenities.build(amenity_params)
		if @amenity.save
			redirect_to community_floorplan_amenities_path(@community,@floorplan), notice: "Amenity created successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
      render :new
		end
	end

	def update
		@amenity = @floorplan.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to community_floorplan_amenities_path(@community,@floorplan), notice: "Amenity updated successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
      render :edit
		end
	end

	def destroy
		@amenity = @floorplan.amenities.find (params[:id])
		if @amenity.destroy
			redirect_to community_floorplan_amenities_path(@community,@floorplan), notice: "Amenity deleted successfully"
		else
			redirect_to community_floorplan_amenities_path(@community,@floorplan), error: @amenity.errors.full_messages.join(',')
		end
	end

	def plot_amenity
		@amenity = Amenity.find (params[:amenity_id])
		@amenity.x_plot = params[:x_plot]
		@amenity.y_plot = params[:y_plot]
		if @amenity.save(validate: false)
			render json: {amenity: @amenity}, status: 200
    else
      render json: {}, status: 404
    end
	end

	def plot_amenities
		@sitemap = @floorplan
    @amenities = @floorplan.amenities
    if @floorplan.image.blank? 
    	flash[:error] = "Kindly add floor plan image first"
    	redirect_to community_floorplans_path(@community)
    end
	end

	def remove_amenities_plot
		@floorplan.amenities.each do |amenity|
			amenity.x_plot = 0
			amenity.y_plot = 0
			amenity.save(validate: false)
		end
		redirect_to plot_amenities_community_floorplan_amenities_path(@community,@floorplan), notice: "All plots have been deleted successfully."
	end

	def remove_amenity
		amenity = Amenity.find params[:id]
		amenity.x_plot = 0
		amenity.y_plot = 0
		amenity.save(validate: false)
		redirect_to plot_amenities_community_floorplan_amenities_path(@community,@floorplan), notice: "Amenity plot have been deleted successfully."
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