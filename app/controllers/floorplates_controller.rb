class FloorplatesController < ApplicationController
	before_action :authenticate_user!
	before_action :set_floorplate, only: [:edit,:update,:destroy]
	def index
		@floorplates = current_community.floorplates
	end

	def new
		@floorplate = Floorplate.new
	end

	def create
		@floorplate = current_community.floorplates.new(floorplate_params)
		if @floorplate.save
			flash[:notice] = "Floor Plate is created successfully."
			redirect_to community_floorplates_path(current_community)
		else
			flash[:error] = @floorplate.errors.full_messages.join(',')
			render :new
		end
	end

	def edit
	end

	def update
		if @floorplate.update(floorplate_params)
			flash[:notice] = "Floor Plate is updated successfully."
			redirect_to community_floorplates_path(current_community)
		else
			flash[:error] = @floorplate.errors.full_messages.join(',')
			render :edit
		end
	end

	def destroy
		@floorplate.destroy
		flash[:notice] = "Floorplate is deleted successfully."
		redirect_to community_floorplates_path(current_community)
	end

	def plotexp
		@floorplate = Floorplate.find params[:floorplate_id]
	    add_breadcrumb "Plot Floor Plate Units", community_floorplate_plotexp_path(current_community,@floorplate)
	    unless current_community.units.size > 0
	      flash[:error] = "Please import unit data first"
	    end
	    @units = current_community.units.order(:building, :unit_type)
	end

	private

	def floorplate_params
		params.require(:floorplate).permit!
	end

	def  set_floorplate
		@floorplate = Floorplate.find params[:id]
	end
end