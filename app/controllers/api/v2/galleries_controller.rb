class Api::V2::GalleriesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community
  before_action :find_gallery, only: [:destroy, :upload_gallery_image, :update_gallery_name, :get_gallery_media]
  before_action :find_gallery_image, only: [:delete_gallery_image]

  def index
    @galleries = @community.galleries.order(:sort)
  end


  def get_gallery_media
  end

  def create_new_gallery
    begin
      @gallery = @community.galleries.new(name: params[:name])

      if @gallery.save
        render :json => {:success => true, :error_code => 200, :message => "Gallery created successfully", data: @gallery}
      else
        render json: { success: false, error_code: 400, message: "Can't create gallery" }, status: 400
      end

    rescue => error
      render json: { success: false, error_code: 400, message: "#{error.message}" }, status: 400
    end
  end

  def upload_gallery_image
    begin
      if @gallery.present?
        file = params[:file]

        begin
          
          if video_file?(file)
            @gallery_media = create_gallery_video(@gallery, file)
          else
            @gallery_media = @gallery.gallery_images.create(image: file, community_id: @community.id)
          end
          
        rescue => error
          render json: { success: false, error_code: 400, message: "#{error.message}" }, status: 400
        end

      else
        render json: { success: false, error_code: 404, message: "Can't find gallery" }, status: 404
      end
      
    rescue => error
      render json: { success: false, error_code: 400, message: "#{error.message}" }, status: 400
    end
  end

  def update_gallery_status
    begin
      @galleries = @community.galleries
      @community.submit_launch_form(TOUCH_GALLERY_MEDIA, current_pynwheel_user, params[:status])

      render :json => {:success => true, :error_code => 200, :message => "Gallery status updated successfully"}
    rescue => error
      render json: { success: false, error_code: 400, message: "#{error.message}" }, status: 400
    end
  end

  def update_gallery_name
    begin
      if @gallery.present?
        @gallery.update(name: params[:name])
        render :json => {:success => true, :error_code => 200, :message => "Gallery name updated successfully"}
      else
        render json: { success: false, error_code: 404, message: "Can't find gallery" }, status: 404
      end
    rescue => error
      render json: { success: false, error_code: 400, message: "#{error.message}" }, status: 400
    end
  end

  def destroy
    #PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "destroy",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
		@gallery.delete_gallery
    @community.set_gallery_images_status(current_pynwheel_user, "")
    render :json => {:success => true, :error_code => 200, :message => "Gallery deleted successfully", data: nil}
	end

  def delete_gallery_image
    if @gallery_image.present?
      file_type = @gallery_image.is_video? ? 'Video' : 'Image'
      #PaperTrail::Version.create(item_type: "GalleryImage",item_id: @gallery_image.id,event: "destroy",community_id: @community.id, company_id: @community.company.id,whodunnit: current_pynwheel_user.id,object: "name: '#{@gallery_image.name}' gallery_id: #{@gallery_image.gallery_id} community_id: '#{@community.id}'")
      if @gallery_image.destroy
        @community.set_gallery_images_status(current_pynwheel_user, "")
        render :json => {:success => true, :error_code => 200, :message => "#{file_type} deleted successfully.", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @gallery.errors.full_messages}
      end
    end
	end

  private

  def create_gallery_video(gallery, file)
    @uploader = GalleryImage.new()
    
    if @uploader.save
      @uploader.name = file.original_filename
      @uploader.video = file
      @uploader.gallery_id = gallery.id
      @uploader.save
    end
    
    @uploader
  end
  
  def video_file?(file)
    file.path.include?("mp4") rescue false
  end

  def set_community
		@community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 404, message: 'Community not found', data: nil}, status: :not_found
	end

	def gallery_params
		params.require(:gallery).permit!
	end

  def find_gallery
    @gallery ||= @community.galleries.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 404, message: 'Gallery not found', data: nil}, status: :not_found
  end

  def find_gallery_image
    @gallery_image ||= GalleryImage.find(params[:gallery_image_id])
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 404, message: 'Gallery Image not found', data: nil}, status: :not_found
  end
end
