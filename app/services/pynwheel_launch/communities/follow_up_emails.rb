class PynwheelLaunch::Communities::FollowUpEmails
  def initialize(community)
    @community = community
  end

  def send_emails
    forms = forms_list
    if forms.present?
      readable_forms_status = get_readable_form_status(forms)
      if forms.all?{|x| x[:status].eql?(IN_PROGRESS) || x[:status].eql?(nil)}
        return {type: APPLICATION_NOT_STARTED, data: readable_forms_status}
      elsif forms.any?{|x| x[:status].eql?(IN_PROGRESS) || x[:status].eql?(nil)} && !forms.all?{|x| x[:status].eql?(IN_PROGRESS) ||x[:status].eql?(nil)}
        return {type: APPLICATION_IN_PROGRESS, data: readable_forms_status}
      # elsif forms.all?{|x| x[:status].eql?(SUBMITTED) || x[:status].eql?(APPROVED) || x[:status].eql?(RELEASED) || x[:status].eql?(APPLICATION_IN_REVIEW)} && forms.any?{|x| x[:status].eql?(SUBMITTED)} 
      #   return {type: APPLICATION_SUBMITTED, data: readable_forms_status}
      else
        return {data: readable_forms_status}
      end
    end
  end

  def non_production_communities_email
    forms = forms_list
    if forms.present?
      readable_forms_status = get_readable_form_status(forms)
      if forms.any?{|x| x[:status].eql?(IN_PROGRESS) || x[:status].eql?(nil)}
        return {type: APPLICATION_NOT_STARTED, data: readable_forms_status}
      else
        return {}
      end
    end
  end

  private

  def mendatory_detail_forms
    [
      {
        name: COMMUNITY_DETAILS,
        status: community_status
      },
      {
        name: PROPERTY_MANAGEMENT_SYSTEM,
        status: data_provider_status
      },
      {
        name: PROPERTY_MAP_IMAGES,
        status: property_map_status
      },
      {
        name: FLOORPLAN_IMAGES,
        status: floorplan_status
      }
    ]
  end

  def forms_for_self_tour
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

  def forms_for_touch_app
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

  def forms_list
    detail_forms = mendatory_detail_forms
    pynwheel_touch_forms = forms_for_touch_app
    if @community.product_options.nil?
      self_tour = @community.self_tour
      pynwheel_touch = @community.touchscreen_app
    else
      product_options = JSON.parse(@community.product_options)
      self_tour = product_options["product_options"]["self_tour"]["is_enabled"]
      pynwheel_touch = product_options["product_options"]["pynwheel_touch"]["is_enabled"]
    end
    pynwheel_touch_forms.each {|x| detail_forms << x} if pynwheel_touch
    self_tour_forms = forms_for_self_tour
    if self_tour
      self_tour_forms.each do |x|
        detail_forms << x
      end
    end
    detail_forms << design_direction_form if design_direction_form_require
    detail_forms << amenity_images_form if amenity_images_form_require
    detail_forms << ebrochure_form
    detail_forms << additional_pages_form if additional_pages_form_require
    detail_forms
  end

  def community_status
    return nil if @community.status.blank?
    @community&.status&.status
  end

  def property_map_status
    if @community.is_sitemap
      sitemap = @community.sitemap
      sitemap&.status&.status
    elsif @community.has_floorplates?
      floorplates = @community.floorplates
      floorplate_status = floorplates.map {|floorplate| floorplate&.status&.status rescue nil}
      status = status_check(floorplate_status)
      status
    end
  end

  def floorplan_status
    return nil if @community.floorplans.blank?
    floorplans = @community.floorplans
    floorplan_status = floorplans.map {|floorplan| floorplan&.status&.status rescue nil}
    status = status_check(floorplan_status)
    status
  end

  def data_provider_status
    return nil if @community.data_provider.blank? && @community.credential.blank?
    data_provider_status = []
    credential = Credential.where(community_id: @community.id).order(updated_at: :desc).first
    data_provider_status << credential&.status&.status rescue nil

    if @community.credential&.use_different_crm_provider
      data_provider_status << @community.crm_credential&.status&.status rescue nil
    end
    status = status_check(data_provider_status)
    status
  end

  def touch_gallery_media_status
    return nil if @community.galleries.blank?
    galleries = @community.galleries
    gallery_media_status = galleries.map {|gallery| gallery&.status&.status rescue nil} if galleries.present?
    status = status_check(gallery_media_status)
    status
  end

  def hardware_specs_status
    return nil if @community&.hardware_spec.blank?
    hardware_spec = @community.hardware_spec
    hardware_status = hardware_spec.present? ? @community&.hardware_spec&.status&.status : nil
    hardware_status
  end

  def home_page_media_status
    return nil if @community.design.blank? && @community.design&.home_page_images.blank? && @community.design&.home_page_video.blank?
    home_page_images = @community.design.home_page_images
    home_page_video = @community.design.home_page_video
    home_page_medias_status = []
    home_page_images.each {|hp_img| home_page_medias_status << hp_img&.status&.status rescue nil} if home_page_images.present?
    home_page_medias_status << home_page_video&.status&.status rescue nil if home_page_video.present?
    status = status_check(home_page_medias_status)
    status
  end

  def tour_stops_status
    return nil if @community.portal_tour&.portal_tour_stops.blank?
    tour_stops = @community.portal_tour&.portal_tour_stops
    
    tour_stops_status = tour_stops.map {|ts| ts&.status&.status rescue nil}
    status = status_check(tour_stops_status)
    status
  end

  def lock_providers_status
    return nil if @community.zerv.blank? && @community.latch.blank? && @community.dwelo.blank? && @community.edge_state.blank? && @community&.edge_state&.remote_locks.blank?
    locks_status = []
    
    zerv = @community.zerv
    latch = @community.latch
    dwelo = @community.dwelo
    remote_locks = @community.edge_state&.remote_locks
    other_locks = @community.other_lock

    locks_status << zerv&.status&.status rescue nil if zerv.present?
    locks_status << latch&.status&.status rescue nil if latch.present?
    locks_status << dwelo&.status&.status rescue nil if dwelo.present?
    locks_status << other_locks&.status&.status rescue nil if !other_locks.nil?
    
    unless remote_locks.nil?
      remote_locks.each {|remote_lock| locks_status << remote_lock&.status&.status rescue nil}
    end

    status = status_check(locks_status)
    status
  end

  def visiting_hours_status
    return nil if @community.opening_hours.blank? && @community.guided_opening_hours.blank?
    self_visiting_hours_status = []
    guided_visiting_hours_status = []
    self_visiting_hours = @community.opening_hours
    guided_visiting_hours = @community.guided_opening_hours
    self_visiting_hours.map {|oh| self_visiting_hours_status << oh&.status&.status} if self_visiting_hours.present?
    guided_visiting_hours.map {|gh| guided_visiting_hours_status << gh&.status&.status} if guided_visiting_hours.present?
    visiting_hours_status = guided_visiting_hours_status.compact + self_visiting_hours_status.compact
    status_check(visiting_hours_status)
  end

  def ebrochure_status
    return nil if @community.favorite_setting.blank?
    status = []
    weblinks = @community.favorite_setting.ebrochure_menu_buttons
    weblinks.map { |weblink| status << weblink&.status&.status } if weblinks.present?

    favorite_images = @community.favorite_setting.favorite_images
    favorite_images.map { |image| status << image&.status&.status } if favorite_images.present?

    status_check(status.compact)
  end

  def additional_pages_status
    return nil if @community.webpages.blank? && @community.imagepages.blank?

    status = []
    webpages = @community.webpages
    webpages.map {|webpage| status << webpage&.status&.status} if webpages.present?

    imagepages = @community.imagepages
    imagepages.map {|imagepage| status << imagepage&.status&.status} if imagepages.present?

    status_check(status.compact)
  end

  def design_direction_status
    return nil if @community&.design_direction.status.blank?
    @community&.design_direction&.status&.status
  end

  def amenity_images_status
    return nil if @community.amenities.blank?
    status = []
      amenities = @community.amenities
      amenities.map {|amenity| status << amenity&.status&.status}
    status_check(status.compact)
  end

  def get_readable_form_status(forms)
    readable_form_status = [];
    forms.each do |form|
      readable_form_status << {name: form[:name], status: modify_status_readable(form[:status])}
    end
    readable_form_status
  end

  def modify_status_readable(status)
    case status
    when SUBMITTED
      return "Submitted"
    when APPROVED || FORM_APPROVED
      return "Approved"
    when IN_PROGRESS
      return "In Progress..."
    when APPLICATION_IN_REVIEW
      return "Submitted for Review"
    when RELEASED
      return "Application Released"
    when REJECTED
      return "Attention Required"
    when DEPLOYED
      return "Deployed"
    else
      return "Not Provided"
    end
  end

  def status_check(statuses)
    if !statuses.empty?
      return REJECTED if statuses.any?{|x| x.eql?(REJECTED)}
      return SUBMITTED if statuses.all?{|x| x.eql?(SUBMITTED)}
      return APPROVED if statuses.all?{|x| x.eql?(APPROVED)}
      return IN_PROGRESS if statuses.any? {|x| x.eql?(IN_PROGRESS) || x.eql?(nil)}
      return RELEASED if statuses.all?{|x| x.eql?(RELEASED)}
      return FORM_APPROVED if statuses.all?{|x| x.eql?(FORM_APPROVED)}
      return APPLICATION_IN_REVIEW if statuses.all?{|x| x.eql?(APPLICATION_IN_REVIEW)}
    else
      return nil
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
    return false if @community.product_options.nil?
    products = JSON.parse(@community.product_options)
    return true if products["product_options"]["pynwheel_touch"]["options"]["installation"].eql?("Yes")
    false
  end

end