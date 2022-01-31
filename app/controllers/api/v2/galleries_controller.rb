class Api::V2::GalleriesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community

  def index
    @gallery = @community.galleries.order(:sort)
    if @gallery.present?
      render :json => {:success => true, :message => "Community galleries found succesfully.", data: @gallery.as_json}
    else
      render :json => {:success => false, :message => "No gallery exist for this community"}
    end
  end

  def update_galleries
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
        update_gallery_images(@gallery,gallery_images)
      else
        @gallery = @community.galleries.create(name: gallery["name"], community_id: @community.id)
        gallery_images = gallery["image"] rescue []

        if gallery_images.present?
          gallery_images.values.each do |img|
            create_gallery_images(@gallery,img)
          end
        end
        PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "create",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
      end
    end
    if @gallery.present?
      @community.set_gallery_images_status(current_pynwheel_user)
      render :json => {:success => true, data: @gallery.as_json}
    else
      render :json => {:success => false, :message => @gallery.errors.full_messages}
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
            file_type = "GalleryVideo"
            @gallery_image.update_attributes(name: image_name, video: img["file"])
          else
            file_type = "GalleryImage"
            @gallery_image.update_attributes(name: image_name, image: img["file"])
          end
          PaperTrail::Version.create(item_type: file_type,item_id: gallery.id,event: "update",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{gallery.name}' community_id: '#{@community.id}'")
        end
      else
        create_gallery_images(gallery,img)
      end
    end
  end

  def create_gallery_images(gallery,community_gallery_img)
    file = community_gallery_img["file"]
    is_video_file = video_file?(file)
    if is_video_file
      create_gallery_video(gallery,file)
    else
      gallery.gallery_images.create(image: file, community_id: @community.id)
    end
    file_type = is_video_file ? "GalleryVideo" : "GalleryImage"
    PaperTrail::Version.create(item_type: file_type,item_id: gallery.id,event: "create",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{gallery.name}' community_id: '#{@community.id}'")
  end

  def create_gallery_video(gallery,file)
    @gallery_image = GalleryImage.new(community_id: @community.id)
    if @gallery_image.save!
      @gallery_image.remote_video_url = @gallery_image.video.direct_fog_url + file.path
      @gallery_image.gallery_id = gallery.id
      @gallery_image.name = file.original_filename
      @gallery_image.standard_image_url = @gallery_image.remote_video_url
      @gallery_image.save
    end
  end

  private 

  def video_file?(file)
    file.path.include?("mp4") rescue false
  end

  def set_community
		@community = Community.find params[:community_id]
	end

	def gallery_params
		params.require(:gallery).permit!
	end
end
