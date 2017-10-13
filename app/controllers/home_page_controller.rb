class HomePageController < ApplicationController
	def index
	  @design = current_community.design || current_community.create_design
      @home_page_images = @design.home_page_images.order(:sort).all
	end

	def save_home_page_image
		current_community.design.home_page_images.create(image: params[:src],name: params[:name])
		@home_page_images = current_community.design.home_page_images.order(:sort).all
	end

	def show_image_in_modal
		@home_page_image = HomePageImage.find(params[:home_page_image_id])
	end

	def update_home_page_image
		@home_page_image = HomePageImage.find(params[:home_page_image_id])
		@home_page_image.update(home_page_image_params)
		flash[:notice] = "Image is edited successfully."
		redirect_to :back
	end

	def delete_home_page_image
		@home_page_image = HomePageImage.find(params[:home_page_image_id])
		@home_page_image.destroy
		flash[:notice] = "Image deleted successfully."
		redirect_to :back
	end

    def save_home_page_video
		current_community.design.home_page_videos.create(video: params[:src],name: params[:name])
	end

	def delete_home_page_video
		@home_page_video = HomePageVideo.find(params[:home_page_video_id])
		@home_page_video.destroy
		flash[:notice] = "Video deleted successfully."
		redirect_to community_home_page_index_path(current_community,tab: "videos")
	end

	private

	def home_page_image_params
		params.require(:home_page_image).permit!
	end
end