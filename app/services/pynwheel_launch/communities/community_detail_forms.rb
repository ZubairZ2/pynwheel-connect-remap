class PynwheelLaunch::Communities::CommunityDetailForms
  def initialize(community)
    @community = community
  end

  def get_community_detail_forms(products)
    community_products = products
    detail_forms = mendatory_detail_forms
    forms_for_touch_app(community_products).each {|x| detail_forms << x} if products.include?("pynwheel_touch")
    forms_for_self_tour(community_products).each {|a| detail_forms << a} if products.include?("self_tour")
    detail_forms
  end

  def mendatory_detail_forms
    [
      {
        name: COMMUNITY_DETAILS,
        status: community_status
      },
      {
        name: PROPERTY_MAP_IMAGES,
        status: property_map_status
      },
      {
        name: FLOORPLAN_IMAGES,
        status: floorplan_status
      },
      {
        name: PROPERTY_MANAGEMENT_SYSTEM,
        status: data_provider_status
      }
    ]
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
      },
      {
        name: HARDWARE_SPECS,
        status: hardware_specs_status
      }
    ]
  end

  private

  def community_status
    return "" if @community.status.blank?
    @community&.status&.status_and_remarks_obj
  end

  def property_map_status
    if @community.is_sitemap
      sitemap = @community.sitemap
      sitemap&.status&.status_and_remarks_obj
    elsif @community.has_floorplates?
      floorplates = @community.floorplates
      floorplate_status = floorplates.map {|floorplate| floorplate&.status&.status_and_remarks_obj rescue ""}
      floorplate_status.compact.uniq
    end
  end

  def floorplan_status
    return "" if @community.floorplans.blank?
    floorplans = @community.floorplans
    floorplan_status = floorplans.map {|floorplan| floorplan&.status&.status_and_remarks_obj rescue ""}
    floorplan_status.compact.uniq
  end

  def data_provider_status
    return "" if @community.data_provider.blank? && @community.credential.blank?
    data_provider_status = []
    data_provider_status << @community.credential&.status&.status_and_remarks_obj rescue ""

    if @community.credential&.use_different_crm_provider
      data_provider_status << @community.crm_credential&.status&.status_and_remarks_obj rescue ""
    end

    data_provider_status.compact.uniq
  end

  def visiting_hours_status
    return "" if @community.opening_hours.blank? && @community.guided_opening_hours.blank?
    visiting_hours_status = []
    self_visiting_hours = @community.opening_hours
    guided_visiting_hours = @community.guided_opening_hours
    visiting_hours_status << self_visiting_hours.map {|oh| oh&.status&.status_and_remarks_obj rescue ""} if self_visiting_hours.present?
    visiting_hours_status << guided_visiting_hours.map {|gh| gh&.status&.status_and_remarks_obj rescue ""} if guided_visiting_hours.present?
    visiting_hours_status.flatten.compact.uniq
  end

  def touch_gallery_media_status
    return "" if @community.galleries.blank?
    galleries = @community.galleries
    gallery_media_status = galleries.map {|gallery| gallery&.status&.status_and_remarks_obj rescue ""} if galleries.present?
    gallery_media_status.compact.uniq
  end

  def hardware_specs_status
    return "" if @community.community_users.blank?
    product_options = @community.product_options
    hardware_status = (product_options.present? && @community.check_required_hardware(product_options)) ? @community&.status&.status_and_remarks_obj : ""
    hardware_status
  end

  def home_page_media_status
    return "" if @community.design.blank? && @community.design&.home_page_images.blank? && @community.design&.home_page_video.blank?
    home_page_images = @community.design.home_page_images
    home_page_video = @community.design.home_page_video
    home_page_medias_status = home_page_images.map {|hp_img| hp_img&.status&.status_and_remarks_obj rescue ""} if home_page_images.present?
    home_page_medias_status << home_page_video&.status&.status_and_remarks_obj rescue "" if home_page_video.present?
    home_page_medias_status.compact.uniq rescue ""
  end

  def tour_stops_status
    return "" if @community.tour&.tour_stops.blank?
    tour_stops = @community.tour&.tour_stops
    
    tour_stops_status = tour_stops.map {|ts| ts&.status&.status_and_remarks_obj rescue ""}
    tour_stops_status.compact.uniq
  end

  def lock_providers_status
    return "" if @community.zerv.blank? && @community.latch.blank? && @community.dwelo.blank? && @community.edge_state.blank? && @community&.edge_state&.remote_locks.blank?
    
    locks_status = []
    
    zerv = @community.zerv
    latch = @community.latch
    dwelo = @community.dwelo
    remote_locks = @community.edge_state&.remote_locks

    locks_status << zerv&.status&.status_and_remarks_obj rescue "" if zerv.present?
    locks_status << latch&.status&.status_and_remarks_obj rescue "" if latch.present?
    locks_status << dwelo&.status&.status_and_remarks_obj rescue "" if dwelo.present?
    
    unless remote_locks.nil?
      remote_locks.each {|remote_lock| locks_status << remote_lock&.status&.status_and_remarks_obj rescue ""}
    end

    locks_status.compact.uniq
  end

end
