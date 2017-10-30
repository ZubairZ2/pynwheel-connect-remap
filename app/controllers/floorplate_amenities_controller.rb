class FloorplateAmenitiesController < ApplicationController
	before_action :authenticate_user!
	before_action :set_community_and_floorplate

	def index
        @amenities = @floorplate.amenities
	end

	def new
		@amenity = @floorplate.amenities.build
	end

	def edit
		@amenity = @floorplate.amenities.find(params[:id])
	end

	def create
		@amenity = @floorplate.amenities.build(amenity_params)
		if @amenity.save
			redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity created successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
            render :new
		end
	end

	def update
		@amenity = @floorplate.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity updated successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
            render :edit
		end
	end

	def destroy
		@amenity = @floorplate.amenities.find (params[:id])
		if @amenity.destroy
			redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity deleted successfully"
		else
			redirect_to community_floorplate_amenities_path(@community,@floorplate), error: @amenity.errors.full_messages.join(',')
		end
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