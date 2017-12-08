class GalleriesController < ApplicationController
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Gallery", "#"
		@gallery_images = @community.gallery_images
	end

	def save_gallery_image
		@community.gallery_images.create(image: params[:src])
		@gallery_images = @community.gallery_images.order(:sort).all
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end