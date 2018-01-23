class GalleriesController < ApplicationController
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Galleries", community_galleries_path(@community)
		@galleries = @community.galleries
		# @gallery_images = @community.gallery_images.order(:sort).all
	end

	def new
		@gallery = @community.galleries.new
	end

	def create
		@gallery = @community.galleries.new(gallery_params)
    if @gallery.save
      flash[:notice] = "Gallery created successfully."
    else
      flash[:error] = @gallery.errors.full_messages.join(',')
    end
	end

	def edit
		@gallery = @community.galleries.find(params[:id])
	end

	def update
		@gallery = @community.galleries.find(params[:id])
    if @gallery.update_attributes(gallery_params)
      flash[:notice] = "Gallery updated successfully."
    else
      flash[:error] = @gallery.errors.full_messages.join(',')
    end
	end

	def destroy
		@gallery = @community.galleries.find(params[:id])
    if @gallery.destroy
      flash[:notice] = "Gallery deleted successfully."
    else
      flash[:error] = @gallery.errors.full_messages.join(',')
    end
    redirect_to community_galleries_path(@community)
	end

	def show_images
		@gallery = @community.galleries.find(params[:id])
		@gallery_images = @gallery.gallery_images.order(:sort).all
		add_breadcrumb "Galleries", community_galleries_path(@community)
		add_breadcrumb "#{@gallery.name}", '#'
	end

	def save_gallery_image
		@gallery = @community.galleries.find(params[:id])
		@gallery.gallery_images.create(image: params[:src], community_id: @community.id)
		@gallery_images = @gallery.gallery_images.order(:sort).all
	end

	def delete_gallery_image
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
		@gallery_image.destroy
		flash[:notice] = "Image deleted successfully."
		redirect_back(fallback_location: root_path)
	end

	def show_image_in_modal
		@gallery = @community.galleries.find(params[:id])
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

	def gallery_params
		params.require(:gallery).permit(:name)
	end
end