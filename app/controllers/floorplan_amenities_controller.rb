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

	private

	def set_community_and_floorplan
		@community = Community.find params[:community_id]
		@floorplan = Floorplan.find params[:floorplan_id]
	end

	def amenity_params
    params.require(:amenity).permit!
  end
end