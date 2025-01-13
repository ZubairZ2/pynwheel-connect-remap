class GalleriesUploaderService
  def initialize community, current_pynwheel_user
    @community = community
    @current_pynwheel_user = current_pynwheel_user
  end

  def upload_galleries_images params
    galleries = params["gallery"]
    @status = params["status"]
    @gallery = ""

    galleries.values.each do |gallery|
      gallery_id = gallery["id"]

      if gallery_id.present?
        gallery_images = gallery["image"] rescue []
        @gallery = @community.galleries.find_by_id(gallery_id)

        unless gallery["image"] == @gallery.name  
          puts "------------------------------- Update Gallery Update: #{gallery["name"]} ------------------------\n"
          @gallery.update(name: gallery["name"])
          #PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "update",whodunnit: @current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
        end

        update_gallery_images(@gallery, gallery_images)
      else
        puts "------------------------------- Create Gallery Update: #{gallery["name"]} ------------------------\n"
        @gallery = @community.galleries.create(name: gallery["name"])

        gallery_images = gallery["image"] rescue []

        if gallery_images.present?
          gallery_images.values.each do |img|
            create_gallery_images(@gallery, img)
          end
        end

        #PaperTrail::Version.create(item_type: "Gallery",item_id: @gallery.id,event: "create",whodunnit: @current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{@gallery.name}' community_id: '#{@community.id}'")
      end

    end

    # @galleries = @community.galleries
    previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(TOUCH_GALLERY_MEDIA)
    @community.set_gallery_images_status(@current_pynwheel_user, @status)
    FollowUpMailer.send_email_after_form_submission(@community, TOUCH_GALLERY_MEDIA, previous_status)
  end

  private


  def update_gallery_images(gallery,images)

    return if images.blank?
    img_objects = images.values

    img_objects.each do |img|
      image_id = img["id"]
      if image_id.present? && !image_id.nil? && !image_id.eql?("nil")
        @gallery_image = gallery.gallery_images.find_by_id(image_id)
        puts "------------------------------- Update Gallery Images: #{@gallery_image.name} ------------------------\n"

        if @gallery_image.present?
          image_name = @gallery_image.set_image_name rescue ""

          if @gallery_image.is_video?
            @gallery_image.update(name: image_name, video: img["file"])
          else
            @gallery_image.update(name: image_name, image: img["file"])
          end

          #PaperTrail::Version.create(item_type: "GalleryImage",item_id: gallery.id,event: "update",whodunnit: @current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{gallery.name}' community_id: '#{@community.id}'")
        end

      else
        puts "------------------------------- Create New Gallery Images: ------------------------\n"

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

    #PaperTrail::Version.create(item_type: "GalleryImage",item_id: gallery.id,event: "create",whodunnit: @current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "name: '#{gallery.name}' community_id: '#{@community.id}'")
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

  def video_file?(file)
    file.path.include?("mp4") rescue false
  end

end
