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
      galleries = params["gallery"]
      @gallery = ""
      galleries.values.each do |gallery|
        gallery_id = gallery["id"]
        if gallery_id.present?
          gallery_images = gallery["image"] rescue []
          @gallery = @community.galleries.find_by_id(gallery_id)
          if @gallery.update_attributes(name: gallery["name"])
            PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "update",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
          end
          update_gallery_images(@gallery, gallery_images)
        else
          @gallery = @community.galleries.create(name: gallery["name"])
          gallery_images = gallery["image"] rescue []
          if gallery_images.present?
            gallery_images.values.each do |img|
              create_gallery_images(@gallery, img)
            end
          end
          PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "create",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
        end
      end
      @galleries = @community.galleries
      @community.set_gallery_images_status(current_pynwheel_user)
      email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
      email[:data].each do |mail|
        if mail[:name].eql?(TOUCH_GALLERY_MEDIA) && mail[:status].eql?("Submitted")
          FollowUpMailer.send_submitted_form(@community, TOUCH_GALLERY_MEDIA, email[:data]).deliver_later
        end
      end
      render :json => {:success => true, data: @galleries.as_json}
    rescue => res
      render json: { success: false, error_code: 400, message: "#{res.message}" }, status: 400
    end
	end

  def update_gallery_images(gallery,images)

    return if images.blank?
    img_objects = images.values

    img_objects.each do |img|
      image_id = img["id"]
      if image_id.present? && !image_id.nil? && !image_id.eql?("nil")
        @gallery_image = gallery.gallery_images.find_by_id(image_id)
        if @gallery_image.present?
          image_name = @gallery_image.set_image_name rescue ""
          if @gallery_image.is_video?
            @gallery_image.update_attributes(name: image_name, video: img["file"])
          else
            @gallery_image.update_attributes(name: image_name, image: img["file"])
          end
          PaperTrail::Version.create(item_type: "GalleryImage",item_id: gallery.id,event: "update",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{gallery.name}' community_id: '#{@community.id}'")
        end
      else
        create_gallery_images(gallery, img)
      end
    end
  end

  def create_gallery_images(gallery, community_gallery_img)
    file = community_gallery_img["file"]
    is_video_file = video_file?(file)
    if is_video_file
      create_gallery_video(gallery, file)
    else
      gallery.gallery_images.create(image: file, community_id: @community.id)
    end
    PaperTrail::Version.create(item_type: "GalleryImage",item_id: gallery.id,event: "create",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{gallery.name}' community_id: '#{@community.id}'")
  end

  def create_gallery_video(gallery, file)
    @uploader = GalleryImage.new
    if @uploader.save
      @uploader.name = file.original_filename
      @uploader.video = file
      @uploader.gallery_id = gallery.id
      @uploader.save
    end
  end

  def destroy
    if @gallery.present?
      PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "destroy",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
      if @gallery.destroy
        @community.set_gallery_images_status(current_pynwheel_user)
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
        @community.set_gallery_images_status(current_pynwheel_user)
        render :json => {:success => true, :error_code => 200, :message => "#{file_type} deleted successfully.", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @gallery.errors.full_messages}
      end
    end
	end

  private

  def video_file?(file)
    file.path.include?("mp4") rescue false
  end

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
