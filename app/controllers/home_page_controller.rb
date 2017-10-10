class HomePageController < ApplicationController
	before_action :authenticate_user!
	def index
      
	end

	def save_home_page_image
		current_community.design.home_page_images.create(image: params[:src],name: params[:name])
	end

	def show_image_in_modal
		@home_page_image = HomePageImage.find(params[:home_page_image_id])
	end

	def update_home_page_image
		@home_page_image = HomePageImage.find(params[:home_page_image_id])
		@home_page_image.update(home_page_image_params)
		flash[:notice] = "Image is cropped successfully."
		redirect_to :back
	end

	def delete_home_page_image
		@home_page_image = HomePageImage.find(params[:home_page_image_id])
		@home_page_image.destroy
		flash[:notice] = "Image delete successfully."
		redirect_to :back
	end
	private

	def home_page_image_params
		params.require(:home_page_image).permit!
	end
end