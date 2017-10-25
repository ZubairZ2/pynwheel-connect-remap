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
			render :edit
		end
	end

	def destroy
		@floorplate.destroy
		flash[:notice] = "Floorplate is deleted successfully."
		redirect_to community_floorplates_path(current_community)
	end

	private

	def floorplate_params
		params.require(:floorplate).permit!
	end

	def  set_floorplate
		@floorplate = Floorplate.find params[:id]
	end
end