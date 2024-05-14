class Statuses
  def initialize community, current_user, status
    @community = community
    @current_user = current_user
    @status = status
    @statuses = [ "", nil ,"in_progress", "submitted", "approved", "in_review", "released", "rejected" ]
  end

  def update_statuses
    # set_company_details_status
    set_community_details_status
    set_property_map_status
    set_floorplan_status
    set_data_provider_status
    self_tour = false
    pynwheel_touch = false
    if @community.product_options.nil?
      self_tour = @community.self_tour
      pynwheel_touch = @community.touchscreen_app
    else
      product_options = JSON.parse(@community.product_options)
      self_tour = product_options["product_options"]["self_tour"]["is_enabled"]
      pynwheel_touch = product_options["product_options"]["pynwheel_touch"]["is_enabled"]
    end
    if self_tour
      set_lock_providers_status
      set_tour_stops_status
      set_visiting_hours_status
    end
    if pynwheel_touch
      set_gallery_images_status
      set_touch_vidoes_status
      touch_installation_specification
    end
    set_design_direction_status if design_direction_form_require
    set_amenity_images_status if amenity_images_form_require
    set_ebrochure_status
    set_additional_pages_status if additional_pages_form_require
  end

  private

  def set_design_direction_status
    @community.set_status_for_all(@community.design_direction, @status, @current_user) unless @community&.design_direction.blank?
  end

  def set_amenity_images_status
    amenities = @community.amenities
    amenities.each {|image| @community.set_status_for_all(image, @status, @current_user)} if amenities.present?
  end

  def set_additional_pages_status
    webpages = @community.webpages
    image_pages = @community.imagepages
    webpages.each {|webpage| @community.set_status_for_all(webpage, @status, @current_user)} if webpages.present?
    image_pages.each {|image| @community.set_status_for_all(image, @status, @current_user)} if image_pages.present?
  end

  def set_ebrochure_status
    weblinks = @community&.favorite_setting&.ebrochure_menu_buttons
    favorite_images = @community&.favorite_setting&.favorite_images
    weblinks.each {|weblink| @community.set_status_for_all(weblink, @status, @current_user)} if weblinks.present?
    favorite_images.each {|image| @community.set_status_for_all(image, @status, @current_user)} if favorite_images.present?
  end

  def set_company_details_status
    if @statuses.find_index(@community.company.status.status) < @statuses.find_index(@status)
      @community.company.set_status_for_all(@community.company, @status, @current_user) unless @community.company.blank?
    end
  end

  def set_community_details_status
    @community.set_status_for_all(@community, @status, @current_user) unless @community.blank?
  end

  def set_property_map_status
    if @community.is_sitemap && !@community.sitemap.blank?
      @community.set_status_for_all(@community.sitemap, @status, @current_user)
    elsif @community.floorplates.any?
      @community.floorplates.each do |floorplate|
        @community.set_status_for_all(floorplate, @status, @current_user)
      end
    end
  end

  def set_floorplan_status
    if @community&.floorplans.any?
      @community.floorplans.each do |floorplan|
        @community.set_status_for_all(floorplan, @status, @current_user)
      end
    end
  end

  def set_gallery_images_status
    if @community&.galleries.any?
      @community.galleries.each do |gallery|
        @community.set_status_for_all(gallery, @status, @current_user)
      end
    end
  end

  def set_touch_vidoes_status
    unless @community&.design&.home_page_images.blank?
      @community&.design&.home_page_images.each do |touch_img|
        @community.set_status_for_all(touch_img, @status, @current_user)
      end
    end

    @community.set_status_for_all(@community&.design&.home_page_video, @status, @current_user) unless @community&.design&.home_page_video.blank?
  end

  def set_data_provider_status
    unless @community&.credential.blank?
      @community.set_status_for_all(@community.credential, @status, @current_user)

      if @community&.credential&.use_different_crm_provider
        @community.set_status_for_all(@community.crm_credential, @status, @current_user) unless @community&.crm_credential.blank?
      end

    end
  end

  def touch_installation_specification
    @community.set_status_for_all(@community.hardware_spec, @status, @current_user) unless @community&.hardware_spec.blank?
  end

  def set_lock_providers_status
    @community.set_status_for_all(@community.zerv, @status, @current_user)  unless @community.zerv.blank?
    @community.set_status_for_all(@community.latch, @status, @current_user)  unless @community.latch.blank?
    @community.set_status_for_all(@community.dwelo, @status, @current_user)  unless @community.dwelo.blank?
    @community.set_status_for_all(@community.igloohome, @status, @current_user) unless @community.igloohome.blank?
    @community.set_status_for_all(@community.yale, @status, @current_user) unless @community.yale.blank?
    @community.set_status_for_all(@community.schlage, @status, @current_user) unless @community.schlage.blank?
    @community.set_status_for_all(@community.launch_remote, @status, @current_user) unless @community.launch_remote.blank?

    unless @community.other_locks.blank?
      other_locks = @community&.other_locks
      other_locks.each { |lock| @community.set_status_for_all(lock, @status, @current_user) }
    end

  end

  def set_tour_stops_status
    @tour = @community.community_tour
    unless @tour.tour_stops.blank?
      tour_stops = @tour.tour_stops.compact

      tour_stops.each do |stop|
        @community.set_status_for_all(stop, @status, @current_user)
      end
    end
  end

  def set_visiting_hours_status
    @tour = @community.community_tour
    if @community.self_tour
      if @tour&.tour_setting&.allow_self_tour
        unless @community&.opening_hours.blank?
          @community.opening_hours.each do |oh|
            @community.set_status_for_all(oh, @status, @current_user)
          end
        end
      end

      if @tour&.tour_setting&.allow_guided_tour
        unless @community&.guided_opening_hours.blank?
          @community.guided_opening_hours.each do |gh|
            @community.set_status_for_all(gh, @status, @current_user)
          end
        end
      end
      
    end
  end

  def design_direction_form_require
    return false if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return true if products["product_options"]["pynwheel_touch"]["is_enabled"] && (products["product_options"]["pynwheel_touch"]["options"]["design_style"].eql?("Modernist Horizontal") || products["product_options"]["pynwheel_touch"]["options"]["design_style"].eql?("Modernist Vertical") || products["product_options"]["pynwheel_touch"]["options"]["design_style"].eql?("Expressionist"))
    false
  end

  def amenity_images_form_require
    return false if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return true if !products["product_options"]["self_tour"]["is_enabled"] && (products["product_options"]["pynwheel_touch"]["is_enabled"] || products["product_options"]["pynwheel_maps"])
    false
  end

  def additional_pages_form_require
    return false if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return true if !products["product_options"]["self_tour"]["is_enabled"] && products["product_options"]["pynwheel_touch"]["is_enabled"] && !products["product_options"]["pynwheel_maps"]
    false
  end

  def hardware_spec_form_require
    return true if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return false if products["product_options"]["pynwheel_touch"]["options"]["installation"].eql?("No")
    true
  end

end