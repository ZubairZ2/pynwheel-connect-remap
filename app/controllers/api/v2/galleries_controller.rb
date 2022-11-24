class Api::V2::GalleriesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community
  before_action :find_gallery, only: [:destroy]
  before_action :find_gallery_image, only: [:delete_gallery_image]

  def index
    @gallery = @community.galleries.order(:sort)
    if @gallery.present?
      render :json => {:success => true, :message => "Community galleries found succesfully.", data: @gallery.as_json}
    else
      render :json => {:success => false, :message => "No gallery exist for this community"}
    end
  end

  def update_galleries
    begin
      GalleriesUploaderJob.perform_async(params, @community, current_pynwheel_user)
      render :json => {:success => true, data: []}
    rescue => res
      render json: { success: false, error_code: 400, message: "#{res.message}" }, status: 400
    end
	end

  def destroy
    if @gallery.present?
      PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "destroy",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
      if @gallery.destroy
        @community.set_gallery_images_status(current_pynwheel_user, "in_progress")
        render :json => {:success => true, :error_code => 200, :message => "Gallery deleted successfully", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @gallery.errors.full_messages}
      end
    end
	end

  def delete_gallery_image
    if @gallery_image.present?
      file_type = @gallery_image.is_video? ? 'Video' : 'Image'
      PaperTrail::Version.create(item_type: "GalleryImage",item_id: @gallery_image.id,event: "destroy",community_id: @community.id, company_id: @community.company.id,whodunnit: current_pynwheel_user.id,object: "name: '#{@gallery_image.name}' gallery_id: #{@gallery_image.gallery_id} community_id: '#{@community.id}'")
      if @gallery_image.destroy
        @community.set_gallery_images_status(current_pynwheel_user, "in_progress")
        render :json => {:success => true, :error_code => 200, :message => "#{file_type} deleted successfully.", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @gallery.errors.full_messages}
      end
    end
	end

  private
  
  def set_community
		@community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
	end

	def gallery_params
		params.require(:gallery).permit!
	end

  def find_gallery
    @gallery = @community.galleries.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Gallery not found', data: nil}, status: :not_found
  end

  def find_gallery_image
    @gallery_image = GalleryImage.find(params[:gallery_image_id])
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Gallery Image not found', data: nil}, status: :not_found
  end
end
