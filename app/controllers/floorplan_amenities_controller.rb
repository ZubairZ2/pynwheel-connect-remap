class FloorplanAmenitiesController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Apartments", "##"
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
		add_breadcrumb "Floor plans", community_floorplans_path(current_community)
		add_breadcrumb "Plot Amenities", plot_amenities_community_floorplan_amenities_path(@community,@floorplan)
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
		@amenity = Amenity.find params[:id]
		amenities = @floorplan.amenities.where(x_plot: @amenity.x_plot, y_plot: @amenity.y_plot)
		amenities.each do |amenity|
			amenity.x_plot = 0
			amenity.y_plot = 0
			amenity.save(validate: false)
		end
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