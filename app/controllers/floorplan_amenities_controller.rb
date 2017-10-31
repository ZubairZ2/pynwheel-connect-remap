class FloorplanAmenitiesController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Appartments", "##"
	before_action :authenticate_user!
	before_action :set_community_and_floorplan

	def index
        @amenities = @floorplan.amenities.order(id: :desc)
        add_breadcrumb "Floor plans", community_floorplans_path(current_community)
	    add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
	end

	def new
		@amenity = @floorplan.amenities.build
		add_breadcrumb "Floor plans", community_floorplans_path(current_community)
	    add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
	    add_breadcrumb "Add Amenity",new_community_floorplan_amenity_path
	end

	def edit
		@amenity = @floorplan.amenities.find(params[:id])
		add_breadcrumb "Floor plans", community_floorplans_path(current_community)
	    add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
	    add_breadcrumb "Edit Amenity",edit_community_floorplan_amenity_path(current_community,@floorplan,@amenity)
	end

	def create
		@amenity = @floorplan.amenities.build(amenity_params)
		if @amenity.save
			redirect_to community_floorplan_amenities_path(@community,@floorplan), notice: "Amenity created successfully"
		else
			add_breadcrumb "Floor plans", community_floorplans_path(current_community)
	        add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
	        add_breadcrumb "Add Amenity",new_community_floorplan_amenity_path
			flash[:error] = @amenity.errors.full_messages.join(',')
            render :new
		end
	end

	def update
		@amenity = @floorplan.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to community_floorplan_amenities_path(@community,@floorplan), notice: "Amenity updated successfully"
		else
			add_breadcrumb "Floor plans", community_floorplans_path(current_community)
	        add_breadcrumb "Amenities", community_floorplan_amenities_path(current_community,@floorplan)
	        add_breadcrumb "Edit Amenity",edit_community_floorplan_amenity_path(current_community,@floorplan,@amenity)
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