class ImagepagesController < ApplicationController
	before_action :set_community
	before_action :check_community
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Additional Pages", :community_additional_pages_path

	def new
		@imagepage = @community.imagepages.new
	end

	def create
		@imagepage = @community.imagepages.new(imagepage_params)
    if @imagepage.save
      flash[:notice] = "Imagepage created successfully."
    else
      flash[:error] = @imagepage.errors.full_messages.join(',')
    end
	end

	def edit
		@imagepage = @community.imagepages.find(params[:id])
	end

	def update
		@imagepage = @community.imagepages.find(params[:id])
		@imagepage.position = nil unless params[:imagepage][:position].present?
    if @imagepage.update_attributes(imagepage_params)
      flash[:notice] = "Imagepage updated successfully."
    else
      flash[:error] = @imagepage.errors.full_messages.join(',')
    end
	end
	def check_community
		unless current_user.is_super_admin?
			if params[:community_id].present?
				all_ids = []
				current_user.communities.each do |c|
					# all_ids.insert(c.id)
					all_ids << c.id
				end
				# byebug
				# puts '+++++++++++++++', all_ids[0]
				if all_ids.include? params[:community_id].to_i

				else
					redirect_to root_path
				end
			end
		end
	end

	def destroy
		@imagepage = @community.imagepages.find(params[:id])
    if @imagepage.destroy
      flash[:notice] = "Imagepage deleted successfully."
    else
      flash[:error] = @imagepage.errors.full_messages.join(',')
    end
    redirect_to community_additional_pages_path(@community)
	end

	def show
		add_breadcrumb "Image Page"
		@imagepage = @community.imagepages.find(params[:id])
		@page_images = @imagepage.additional_images.order(:sort).all
	end

	def save_additional_image
		@imagepage = @community.imagepages.find(params[:id])
		@imagepage.additional_images.create(image: params[:file])
		#@gallery_images = @gallery.gallery_images.order(:sort).all
		render :json=>{"status"=>"success"}
	end

	def delete_additional_image
		@imagepage = @community.imagepages.find(params[:id])
		@additional_image = @imagepage.additional_images.find(params[:additional_image_id])
		@additional_image.destroy
		flash[:notice] = "Image deleted successfully."
		redirect_back(fallback_location: root_path)
	end

	def show_image_in_modal
		@imagepage = @community.imagepages.find(params[:id])
		@additional_image = @imagepage.additional_images.find(params[:additional_image_id])
	end

	def update_additional_image
		@imagepage = @community.imagepages.find(params[:id])
		@additional_image = @imagepage.additional_images.find(params[:additional_image_id])
		if @additional_image.crop_x == params[:additional_image][:crop_x].to_f
			@additional_image.do_crop = false
		else
			@additional_image.do_crop = true
		end
		if params[:additional_image][:crop_h].to_f == 0 && params[:additional_image][:crop_w].to_f == 0
			@additional_image.do_crop = false
		end
		@additional_image.update(additional_image_params)
		flash[:notice] = "Image is edited successfully."
		redirect_back(fallback_location: root_path)
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end

	def imagepage_params
		params.require(:imagepage).permit(:name,:is_slideshow,:hide_page,:display_on_homepage,:position)
	end

	def additional_image_params
		params.require(:additional_image).permit(:name,:crop_x,:crop_y,:crop_w,:crop_h)
	end
end