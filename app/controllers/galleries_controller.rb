class GalleriesController < ApplicationController
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Gallery", community_galleries_path(@community)
		@gallery_images = @community.gallery_images.order(:sort).all
	end

	def save_gallery_image
		@community.gallery_images.create(image: params[:src])
		@gallery_images = @community.gallery_images.order(:sort).all
	end

	def delete_gallery_image
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
		@gallery_image.destroy
		flash[:notice] = "Image deleted successfully."
		redirect_back(fallback_location: root_path)
	end

	def show_image_in_modal
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
	end

	def update_gallery_image
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
		@gallery_image.update(gallery_image_params)
		flash[:notice] = "Image is edited successfully."
		redirect_back(fallback_location: root_path)
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end

	def gallery_image_params
		params.require(:gallery_image).permit!
	end

end