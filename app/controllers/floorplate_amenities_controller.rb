class FloorplateAmenitiesController < ApplicationController
	add_breadcrumb "Home", :root_path
	before_action :authenticate_user!
	before_action :set_community_and_floorplate

	def index
        @amenities = @floorplate.amenities.order(id: :desc)
        add_breadcrumb "Floor plates", community_floorplates_path(current_community)
	    add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
	end

	def new
		@amenity = @floorplate.amenities.build
		add_breadcrumb "Floor plates", community_floorplates_path(current_community)
	    add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
	    add_breadcrumb "Add Amenity",new_community_floorplate_amenity_path
	end

	def edit
		@amenity = @floorplate.amenities.find(params[:id])
		add_breadcrumb "Floor plates", community_floorplates_path(current_community)
	    add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
	    add_breadcrumb "Edit Amenity",edit_community_floorplate_amenity_path(current_community,@floorplate,@amenity)
	end

	def create
		@amenity = @floorplate.amenities.build(amenity_params)
		if @amenity.save
			redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity created successfully"
		else
			add_breadcrumb "Floor plates", community_floorplates_path(current_community)
	        add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
	        add_breadcrumb "Add Amenity",new_community_floorplate_amenity_path
			flash[:error] = @amenity.errors.full_messages.join(',')
            render :new
		end
	end

	def update
		@amenity = @floorplate.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to community_floorplate_amenities_path(@community,@floorplate), notice: "Amenity updated successfully"
		else
			add_breadcrumb "Floor plates", community_floorplates_path(current_community)
	        add_breadcrumb "Amenities", community_floorplate_amenities_path(current_community,@floorplate)
	        add_breadcrumb "Edit Amenity",edit_community_floorplate_amenity_path(current_community,@floorplate,@amenity)
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