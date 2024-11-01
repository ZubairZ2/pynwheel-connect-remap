class GalleriesController < ApplicationController
	# include Error::ErrorHandler
	before_action :set_community
  before_action :check_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Gallery Page", community_galleries_path(@community)
		@galleries = @community.galleries.order(:sort)
		# @gallery_images = @community.gallery_images.order(:sort).all
	end

	def new
		@gallery = @community.galleries.new
	end

	def create
		@gallery = @community.galleries.new(gallery_params)
    if @gallery.save
			#PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "create",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: '#{@gallery.name}' community_id: '#{current_community.id}'")
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
    if @gallery.update_columns(gallery_params)
			#PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: '#{@gallery.name}' community_id: '#{current_community.id}'")
			flash[:notice] = "Gallery updated successfully."
    else
      flash[:error] = @gallery.errors.full_messages.join(',')
    end
	end

	def destroy

		@gallery = @community.galleries.find(params[:id])
		#PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "destroy",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: '#{@gallery.name}' community_id: '#{current_community.id}'")
		@gallery.delete_gallery
		flash[:notice] = "Your gallery will be deleted shortly."
    # if @gallery.destroy
    #   flash[:notice] = "Gallery deleted successfully."
    # else
    #   flash[:error] = @gallery.errors.full_messages.join(',')
    # end
    redirect_to community_galleries_path(@community)
	end

	def show_images
		@uploader = GalleryImage.new.video
		@uploader.success_action_redirect = upload_video_direct_community_gallery_url

		@gallery = @community.galleries.find(params[:id])
		@gallery_images = @gallery.gallery_images.order(:sort).all
		add_breadcrumb "Galleries", community_galleries_path(@community)
		add_breadcrumb "#{@gallery.name}", '#'
	end

	def save_gallery_image
		@gallery = @community.galleries.find(params[:id])
		image = @gallery.gallery_images.create(image: params[:file], community_id: @community.id)
		#PaperTrail::Version.create(item_type: "GalleryImage",item_id: image.id,event: "create",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: '#{image.name}' gallery_id: #{image.gallery_id} community_id: '#{current_community.id}'")

		#@gallery_images = @gallery.gallery_images.order(:sort).all
		render :json=>{"status"=>"success"}
	end
	def upload_video_direct
		@uploader =  GalleryImage.new(params[:gallery_image])
		if @uploader.save
			@uploader.remote_video_url = @uploader.video.direct_fog_url + params[:key]
			@uploader.gallery_id = params[:id]
			@uploader.community_id = params[:community_id]
			@uploader.standard_image_url = @uploader.remote_video_url
			@uploader.name = params[:key].split('/').last
			@uploader.save
			#PaperTrail::Version.create(item_type: "GalleryVideo",item_id: @uploader.id,event: "create",whodunnit: current_user.id,object: "name: '#{@uploader.name}' gallery_id: #{@uploader.gallery_id} community_id: '#{current_community.id}'")

			redirect_to show_images_community_gallery_path, notice: 'Video has been uploaded'
		else
			render action: "index"
		end
	end
	def delete_gallery_image
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
		file_type = @gallery_image.is_video? ? 'Video' : 'Image'
		#PaperTrail::Version.create(item_type: "GalleryImage",item_id: @gallery_image.id,event: "destroy",community_id: current_community.id, company_id: current_company.id,whodunnit: current_user.id,object: "name: '#{@gallery_image.name}' gallery_id: #{@gallery_image.gallery_id} community_id: '#{current_community.id}'")

		@gallery_image.destroy
		flash[:notice] = "#{file_type} deleted successfully."
		redirect_back(fallback_location: root_path)
	end

	def show_image_in_modal
		@gallery = @community.galleries.find(params[:id])
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
	end

	def update_gallery_image
		@gallery_image = GalleryImage.find(params[:gallery_image_id])
		@gallery_image.name = params[:gallery_image][:name]
		if @gallery_image.crop_x == params[:gallery_image][:crop_x].to_f
			@gallery_image.do_crop = false
		else
			@gallery_image.do_crop = true
		end
		if params[:gallery_image][:crop_h].to_f == 0 && params[:gallery_image][:crop_w].to_f == 0
			@gallery_image.do_crop = false
		end
		@gallery_image.crop_x = params[:gallery_image][:crop_x].to_f
		@gallery_image.crop_y = params[:gallery_image][:crop_y].to_f
		@gallery_image.crop_w = params[:gallery_image][:crop_w].to_f
		@gallery_image.crop_h = params[:gallery_image][:crop_h].to_f
		@gallery_image.save
		#PaperTrail::Version.create(item_type: "GalleryImage",item_id: @gallery_image.id,event: "update",community_id: current_community.id, company_id: current_company.id,whodunnit: current_user.id,object: "name: '#{@gallery_image.name}' gallery_id: #{@gallery_image.gallery_id} community_id: '#{current_community.id}'")

		# @gallery_image.update(gallery_image_params)
		flash[:notice] = "Image is edited successfully."
		redirect_back(fallback_location: root_path)
	end

	# def save_gallery_video
	# 	@gallery = @community.galleries.find(params[:id])
	# 	@gallery.gallery_images.create!(image: params[:gallery_page_video], community_id: @community.id)
	# 	@gallery_images = @gallery.gallery_images.order(:sort).all
	# end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end

	def gallery_image_params
		params.require(:gallery_image).permit!
	end

	def gallery_params
		params.require(:gallery).permit!
	end
end