class PynwheelLaunch::Communities::CommunityDetailForms
  def initialize(community)
    @community = community
  end

  def check_status_of_specific_form(form_type)
    case form_type
    when COMPANY_DETAILS
      company_status
    when COMMUNITY_DETAILS
      community_status
    when PROPERTY_MAP_IMAGES
      property_map_status
    when FLOORPLAN_IMAGES
      floorplan_status
    when PROPERTY_MANAGEMENT_SYSTEM
      data_provider_status
    when LOCK_PROVIDER
      lock_providers_status
    when TOUR_STOPS
      tour_stops_status
    when VISITING_HOURS
      visiting_hours_status
    when TOUCH_GALLERY_MEDIA
      touch_gallery_media_status
    when TOUCH_HOME_PAGE_MEDIA
      home_page_media_status
    when HARDWARE_SPECS
      hardware_specs_status
    when DESIGN_DIRECTION
      design_direction_status
    when AMENITY_IMAGES
      amenity_images_status
    when ADDITIONAL_PAGES
      additional_pages_status
    when EBROCHURE
      ebrochure_status
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
    return true if (products["product_options"]["self_tour"]["is_enabled"] || products["product_options"]["pynwheel_touch"]["is_enabled"] || products["product_options"]["pynwheel_maps"])
    false
  end

  def additional_pages_form_require
    return false if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return true if !products["product_options"]["self_tour"]["is_enabled"] && products["product_options"]["pynwheel_touch"]["is_enabled"] && !products["product_options"]["pynwheel_maps"]
    false
  end

  def hardware_spec_form_require
    return false if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return true if products["product_options"]["pynwheel_touch"]["options"]["installation"].eql?("Yes")
    false
  end

  def get_community_detail_forms(products)
    community_products = products
    detail_forms = mendatory_detail_forms
    detail_forms << hardware_spec_form if hardware_spec_form_require
    forms_for_touch_app(community_products).each {|x| detail_forms << x} if products.include?("pynwheel_touch")
    forms_for_self_tour(community_products).each {|a| detail_forms << a} if products.include?("self_tour")
    # detail_forms << floorplan_form if @community&.floorplans&.count > 0
    detail_forms << floorplan_form
    detail_forms << design_direction_form if design_direction_form_require
    detail_forms << amenity_images_form if amenity_images_form_require
    detail_forms << ebrochure_form if products.include?("pynwheel_touch")
    detail_forms << additional_pages_form if additional_pages_form_require

    detail_forms
  end

  def update_status_and_remarks detail_type, status, remarks
    case detail_type
    when COMPANY_DETAILS
      update_company_status_and_remarks(status, remarks)
    when COMMUNITY_DETAILS
      update_community_status_and_remarks(status, remarks)
    when PROPERTY_MAP_IMAGES
      update_property_map_status_and_remarks(status, remarks)
    when FLOORPLAN_IMAGES
      update_floorplan_status_and_remarks(status, remarks)
    when PROPERTY_MANAGEMENT_SYSTEM
      update_data_provider_status_and_remarks(status, remarks)
    when LOCK_PROVIDER
      update_lock_providers_status_and_remarks(status, remarks)
    when TOUR_STOPS
      update_tour_stops_status_and_remarks(status, remarks)
    when VISITING_HOURS
      update_visiting_hours_status_and_remarks(status, remarks)
    when TOUCH_GALLERY_MEDIA
      update_touch_gallery_media_status_and_remarks(status, remarks)
    when TOUCH_HOME_PAGE_MEDIA
      update_home_page_media_status_and_remarks(status, remarks)
    when HARDWARE_SPECS
      update_hardware_specs_status_and_remarks(status, remarks)
    when DESIGN_DIRECTION
      update_design_direction_status_and_remarks(status, remarks)
    when AMENITY_IMAGES
      update_amenity_images_status_and_remarks(status, remarks)
    when ADDITIONAL_PAGES
      update_additional_pages_status_and_remarks(status, remarks)
    when EBROCHURE
      update_ebrochure_status_and_remarks(status, remarks)
    end
  end

  def mendatory_detail_forms
    [
      # {
      #   name: COMPANY_DETAILS,
      #   status: company_status
      # },
      {
        name: PROPERTY_MANAGEMENT_SYSTEM,
        status: data_provider_status
      },
      {
        name: COMMUNITY_DETAILS,
        status: community_status
      },
      {
        name: PROPERTY_MAP_IMAGES,
        status: property_map_status
      }
    ]
  end

  def floorplan_form
    {
      name: FLOORPLAN_IMAGES,
      status: floorplan_status
    }
  end

  def forms_for_self_tour(products)
    return unless products.include?("self_tour")

    [
      {
        name: LOCK_PROVIDER,
        status: lock_providers_status
      },
      {
        name: TOUR_STOPS,
        status: tour_stops_status
      },
      {
        name: VISITING_HOURS,
        status: visiting_hours_status
      }
    ]
  end

  def hardware_spec_form
    {
      name: HARDWARE_SPECS,
      status: hardware_specs_status
    }
  end

  def design_direction_form
    {
      name: DESIGN_DIRECTION,
      status: design_direction_status
    }
  end

  def amenity_images_form
    {
      name: AMENITY_IMAGES,
      status: amenity_images_status
    }
  end

  def ebrochure_form
    {
      name: EBROCHURE,
      status: ebrochure_status
    }
  end

  def additional_pages_form
    {
      name: ADDITIONAL_PAGES,
      status: additional_pages_status
    }
  end

  def forms_for_touch_app(products)
    return unless products.include?("pynwheel_touch")

    [
      {
        name: TOUCH_GALLERY_MEDIA,
        status: touch_gallery_media_status
      },
      {
        name: TOUCH_HOME_PAGE_MEDIA,
        status: home_page_media_status
      }
    ]
  end

  def update_pynwheel_connect_fields params
    return unless @community.community_tour.present?
    @community.community_tour.update(max_self_tour_users: params["tour"]["max_tours"].to_i)
    @community.update(one_hour_email_text: params["tour"]["start_tour"])  
  end

  private

  def company_status
    return [] if @community.company.blank?
    [@community&.company&.status&.status_and_remarks_obj]
  end

  def community_status
    return [] if @community.status.blank?
    [@community&.status&.status_and_remarks_obj]
  end

  def ebrochure_status
    return [] if @community.favorite_setting.blank?
    status = []
    weblinks = @community.favorite_setting.ebrochure_menu_buttons
    weblinks.map {|weblink| status << weblink&.status&.status_and_remarks_obj} if weblinks.present?

    favorite_images = @community.favorite_setting.favorite_images
    favorite_images.map {|image| status << image&.status&.status_and_remarks_obj} if favorite_images.present?

    status.compact.uniq
  end

  def additional_pages_status
    return [] if @community.webpages.blank? && @community.imagepages.blank?
    status = []
    webpages = @community.webpages
    webpages.map {|webpage| status << webpage&.status&.status_and_remarks_obj} if webpages.present?

    imagepages = @community.imagepages
    imagepages.map {|imagepage| status << imagepage&.status&.status_and_remarks_obj} if imagepages.present?
    status.compact.uniq
  end

  def design_direction_status
    return [] if @community&.design_direction&.status.blank?

    [@community&.design_direction&.status&.status_and_remarks_obj]
  end

  def amenity_images_status
    return [] if @community.amenities.blank?
    amenities = @community.amenities
    amenities_status = amenities.map {|amenity| amenity&.status&.status_and_remarks_obj rescue nil}
    amenities_status.compact.uniq
  end

  def property_map_status
    if @community.is_sitemap
      sitemap = @community.sitemap
      [sitemap&.status&.status_and_remarks_obj]
    elsif @community.has_floorplates?
      floorplates = @community.floorplates
      floorplate_status = floorplates.map {|floorplate| floorplate&.status&.status_and_remarks_obj rescue nil}
      floorplate_status.compact.uniq
    end
  end

  def floorplan_status
    return [] if @community.floorplans.blank?
    floorplans = @community.floorplans
    floorplan_status = floorplans.map {|floorplan| floorplan&.status&.status_and_remarks_obj rescue nil}
    floorplan_status.compact.uniq
  end

  def data_provider_status
    return [] if @community.data_provider.blank? && @community.credential.blank?
    data_provider_status = []
    credential = Credential.where(community_id: @community.id).order(updated_at: :desc).first
    data_provider_status << credential&.status&.status_and_remarks_obj rescue nil

    if @community.credential&.use_different_crm_provider
      data_provider_status << @community.crm_credential&.status&.status_and_remarks_obj rescue nil
    end

    data_provider_status.compact.uniq
  end

  def visiting_hours_status
    return [] if @community.opening_hours.blank? && @community.guided_opening_hours.blank?
    visiting_hours_status = []
    self_visiting_hours = @community.opening_hours
    guided_visiting_hours = @community.guided_opening_hours
    visiting_hours_status << self_visiting_hours.map {|oh| oh&.status&.status_and_remarks_obj rescue nil} if self_visiting_hours.present?
    visiting_hours_status << guided_visiting_hours.map {|gh| gh&.status&.status_and_remarks_obj rescue nil} if guided_visiting_hours.present?
    visiting_hours_status.flatten.compact.uniq
  end

  def touch_gallery_media_status
    return [] if @community.galleries.blank?
    galleries = @community.galleries
    gallery_media_status = galleries.map {|gallery| gallery&.status&.status_and_remarks_obj rescue nil} if galleries.present?
    gallery_media_status.compact.uniq
  end

  def hardware_specs_status
    return [] if @community.hardware_spec.nil?
    hardware_spec = @community.hardware_spec
    hardware_status = hardware_spec.present? ? @community&.hardware_spec&.status&.status_and_remarks_obj : nil
    [hardware_status]
  end

  def home_page_media_status
    return [] if @community.design.blank? && @community.design&.home_page_images.blank? && @community.design&.home_page_video.blank?
    home_page_medias_status = []
    home_page_images = @community.design.home_page_images
    home_page_video = @community.design.home_page_video
    home_page_medias_status = home_page_images.map {|hp_img| hp_img&.status&.status_and_remarks_obj rescue nil} if home_page_images.present?
    home_page_medias_status << home_page_video&.status&.status_and_remarks_obj rescue nil if home_page_video.present?
    home_page_medias_status.compact.uniq rescue []
  end

  def tour_stops_status
    return [] if @community.community_tour&.tour_stops.blank?
    tour_stops = @community.community_tour&.tour_stops
    
    tour_stops_status = tour_stops.map {|ts| ts&.status&.status_and_remarks_obj rescue nil}
    tour_stops_status.compact.uniq
  end

  def lock_providers_status
    return [] if @community.zerv.blank? && @community.latch.blank? && @community.dwelo.blank? && @community.edge_state.blank? && @community&.launch_remote.blank? && @community&.yale.blank? && @community&.schlage.blank? && @community.other_locks.blank? && @community.igloohome.blank?
    
    locks_status = []
    
    zerv = @community.zerv
    latch = @community.latch
    dwelo = @community.dwelo
    other_locks = @community.other_locks
    yale_locks = @community.yale
    schlage_locks = @community.schlage
    igloohome_lock = @community.igloohome
    remote_locks = @community.launch_remote

    locks_status << zerv&.status&.status_and_remarks_obj rescue nil if zerv.present?
    locks_status << latch&.status&.status_and_remarks_obj rescue nil if latch.present?
    locks_status << dwelo&.status&.status_and_remarks_obj rescue nil if dwelo.present?
    locks_status << igloohome_lock&.status&.status_and_remarks_obj rescue nil if igloohome_lock.present?
    locks_status << schlage_locks&.status&.status_and_remarks_obj rescue nil  if schlage_locks.present?
    locks_status << yale_locks&.status&.status_and_remarks_obj rescue nil if yale_locks.present?
    
    if other_locks.present?
      other_locks.each do |lock|
        locks_status << lock&.status&.status_and_remarks_obj rescue nil 
      end
    end

    locks_status << remote_locks&.status&.status_and_remarks_obj rescue nil unless remote_locks.nil?
    locks_status.compact.uniq
  end

  def update_company_status_and_remarks status, remarks
    return if @community.company.status.blank?
    @community&.company&.status.update(status: status, remarks: remarks)
  end

  def update_community_status_and_remarks status, remarks
    return if @community.status.blank?
    @community&.status.update(status: status, remarks: remarks)
  end

  def update_property_map_status_and_remarks status, remarks
    if @community.is_sitemap
      @community.sitemap&.status.update(status: status, remarks: remarks)
    elsif @community.has_floorplates?
      @community.floorplates.each {|floorplate| floorplate&.status&.update(status: status, remarks: remarks) }
    end
  end

  def update_floorplan_status_and_remarks status, remarks
    return if @community.floorplans.blank?
    @community.floorplans.each {|floorplan| floorplan&.status&.update(status: status, remarks: remarks) }
  end

  def update_data_provider_status_and_remarks status, remarks
    return if @community.data_provider.blank? && @community.credential.blank?
    credential = Credential.where(community_id: @community.id).order(updated_at: :desc).first
    credential&.status.update(status: status, remarks: remarks) 
    @community.crm_credential&.status.update(status: status, remarks: remarks) if @community.credential&.use_different_crm_provider
  end

  def update_visiting_hours_status_and_remarks status, remarks
    return if @community.opening_hours.blank? && @community.guided_opening_hours.blank?
    @community&.opening_hours.each {|oh| oh&.status.update(status: status, remarks: remarks) } if @community&.opening_hours.present?
    @community&.guided_opening_hours.each {|gh| gh&.status.update(status: status, remarks: remarks) } if @community&.guided_opening_hours.present?
  end

  def update_touch_gallery_media_status_and_remarks status, remarks
    return if @community.galleries.blank?
    @community&.galleries.map {|gallery| gallery&.status.update(status: status, remarks: remarks) } if @community&.galleries.present?
  end

  def update_hardware_specs_status_and_remarks status, remarks
    return if @community.hardware_spec.nil?
    @community&.hardware_spec&.status.update(status: status, remarks: remarks) if @community&.hardware_spec.present?
  end

  def update_home_page_media_status_and_remarks status, remarks
    return if @community.design.blank? && @community.design&.home_page_images.blank? && @community.design&.home_page_video.blank?
    
    home_page_images = @community&.design&.home_page_images
    home_page_video = @community&.design&.home_page_video

    home_page_images.map {|hp_img| hp_img&.status.update(status: status, remarks: remarks) } if home_page_images.present?
    home_page_video&.status.update(status: status, remarks: remarks) if home_page_video.present?
  end

  def update_tour_stops_status_and_remarks status, remarks
    return if @community.community_tour&.tour_stops.blank?
    tour_stops = @community.community_tour&.tour_stops
    tour_stops.map do |ts|
      unless ts.status.nil?
        ts&.status.update(status: status, remarks: remarks)
      end
    end
  end

  def update_lock_providers_status_and_remarks status, remarks
    return if @community.zerv.blank? && @community.latch.blank? && @community.dwelo.blank? && @community.edge_state.blank? && @community&.launch_remote.blank? && @community&.yale.blank? && @community&.schlage.blank? && @community.other_locks.blank? && @community.igloohome.blank?
    
    zerv = @community.zerv
    latch = @community.latch
    dwelo = @community.dwelo
    other_locks = @community.other_locks
    yale_locks = @community.yale
    schlage_locks = @community.schlage
    igloohome_lock = @community.igloohome
    remote_locks = @community.launch_remote

    zerv&.status&.update(status: status, remarks: remarks) if zerv.present?
    latch&.status&.update(status: status, remarks: remarks) if latch.present?
    dwelo&.status&.update(status: status, remarks: remarks) if dwelo.present?
    igloohome_lock&.status&.update(status: status, remarks: remarks) if igloohome_lock.present?
    schlage_locks&.status&.update(status: status, remarks: remarks) if schlage_locks.present?
    yale_locks&.status&.update(status: status, remarks: remarks) if yale_locks.present?
    other_locks&.each {|lock| lock&.status.update(status: status, remarks: remarks) } if other_locks.present?
    remote_locks&.status&.update(status: status, remarks: remarks) unless remote_locks.nil?
  end

  def update_design_direction_status_and_remarks status, remarks
    return if @community&.design_direction&.blank?
    @community&.design_direction&.status.update(status: status, remarks: remarks) if @community&.design_direction.present?
  end

  def update_amenity_images_status_and_remarks status, remarks
    return if @community.amenities.blank?
    @community.amenities.each {|amenity| amenity&.status.update(status: status, remarks: remarks) }
  end

  def update_additional_pages_status_and_remarks status, remarks
    return if @community.imagepages.blank? && @community.webpages.blank?
    @community.imagepages.each {|imagepage| imagepage&.status.update(status: status, remarks: remarks) } if @community.imagepages.present?
    @community.webpages.each {|webpage| webpage&.status.update(status: status, remarks: remarks) } if @community.webpages.present?

  end

  def update_ebrochure_status_and_remarks status, remarks
    return if @community.favorite_setting.blank?
    weblinks = @community.favorite_setting.ebrochure_menu_buttons
    weblinks.each {|weblink| weblink&.status.update(status: status, remarks: remarks) } if weblinks.present?

    images = @community.favorite_setting.favorite_images
    images.each {|image| image&.status.update(status: status, remarks: remarks) } if images.present?

  end

end
