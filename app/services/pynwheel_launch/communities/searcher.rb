class PynwheelLaunch::Communities::Searcher
  attr_reader :user , :params
  def initialize(user , params)
    @user = user
    @params = params
  end

  def get_user_communities
    communities = communities_by_role
  end

  private

  def communities_by_role
    if user.is_new_client?
      communities = user.community_users
    else
      communities = CommunityUser.all
    end

    communities = distinct_user_communities(communities)
    communities = communities_by_search(communities) if search_params
    communities.order(created_at: :desc)
  end

  def distinct_user_communities communities
    return unless communities.present?
    
    community_users_ids = communities.group(:community_id).select("MAX(updated_at)").maximum(:id).values
    CommunityUser.where(id: community_users_ids)
  end

  def communities_by_search(collection)
    query_string = "%#{params[:keyword].strip.downcase}%" if params[:keyword].present?
    company_ids = Company.where('lower(name) like ?' , query_string).pluck(:id)
    communities = collection.joins(:community).where('lower(communities.name) like ? OR communities.company_id in (?)' , query_string , company_ids)
    communities = search_by_products(collection , JSON.parse(params[:products])) if params[:products].present?
    communities = search_by_status(collection , JSON.parse(params[:status])) if params[:status].present?
    communities
  end

  def search_by_products(collection , products)
    selected_communities = []
    collection.each do |community_user|
      product_options = community_user.community.product_options
      if product_options.present?
        get_client_products(product_options , community_user , products , selected_communities)
      else
        old_community_products(community_user , products , selected_communities)
      end
    end
    selected_communities
    communities = CommunityUser.where(id:selected_communities.pluck(:id))
  end

  def search_params
    params[:keyword].present? || params[:products] || params[:status]
  end

  def get_nested_products(obj,key)
    if obj.respond_to?(:key?) && obj.key?(key)
      obj[key]
    elsif obj.respond_to?(:each)
      r = nil
      obj.find{ |*a| r=get_nested_products(a.last,key) }
      r
    end
  end

  def old_community_products(community_user , products , selected_communities)
    community = community_user.community
    products.values.each do |product|
      if product == "pynwheel_touch"
        if community[:touchscreen_app] == true
          selected_communities.push(community_user)
        end
      end
      if community[product] == true
        selected_communities.push(community_user)
      end
    end
  end

  def get_client_products(product_options , community_user , products , selected_communities)
    product_options = JSON.parse(product_options)
    products.values.each do |product|
      if product == "pynwheel_maps"
        product_status = get_nested_products(product_options , product)
        if product_status == true
          selected_communities.push(community_user)
        end
      end
      product_hash = get_nested_products(product_options , product)
      product_status = get_nested_products(product_hash , "is_enabled")
      if product_status == true
        selected_communities.push(community_user)
      end
    end
  end

  def search_by_status(collection , statuses)
    selected_communities = []
    statuses.values.each do |status|
      collection.each do |community_user|
        get_communities_statuses(community_user, status, selected_communities)
      end
    end
    selected_communities
    communities = CommunityUser.where(id:selected_communities.pluck(:id))
  end

  def get_communities_statuses(community_user, status, selected_communities)
    community = community_user.community
    statuses = []

    company_status(community, statuses)

    community_status(community, statuses)

    property_map_status(community, statuses)

    floorplan_status(community, statuses)

    data_provider_status(community, statuses)

    visiting_hours_status(community, statuses)

    touch_gallery_media_status(community, statuses)

    hardware_specs_status(community, statuses)

    lock_providers_status(community, statuses)

    tour_stops_status(community, statuses)

    home_page_media_status(community, statuses)

    if status.eql?(IN_PROGRESS)
      received_status = status_value_check(status)
      if statuses.any?{|x| x.eql?(received_status)} && !statuses.all?{|x| x.eql?(received_status)}
        selected_communities << community_user
      end
    elsif status.eql?(REJECTED)
      received_status = status_value_check(status)
      if statuses.any?{|x| x.eql?(received_status)} && !statuses.all?{|x| x.eql?(received_status)}
        selected_communities << community_user
      end
    else
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status)}
        selected_communities << community_user
      end
    end
    selected_communities
  end

  def status_value_check(status)
    if status.eql?(PARAM_NOT_STARTED) || status.eql?(IN_PROGRESS)
      return "in_progress"
    elsif status.eql?(PARAM_100_CONTENT_SUBMITED)
      return "submitted"
    elsif status.eql?(PARAM_APPROVED_FOR_PRODUCTION)
      return "approved"
    elsif status.eql?(REJECTED)
      return "rejected"
    end
  end

  def company_status(community, statuses)
    return [] if community&.company.status.blank?
    statuses << community&.company&.status&.status
  end

  def community_status(community, statuses)
    return [] if community.status.blank?
    statuses << community&.status&.status
  end

  def property_map_status(community, statuses)
    if community.is_sitemap
      sitemap = community.sitemap
      statuses << sitemap&.status&.status
    elsif community.has_floorplates?
      floorplates = community.floorplates
      floorplates.map {|floorplate| statuses << floorplate&.status&.status}
    end
  end

  def floorplan_status(community, statuses)
    return [] if community.floorplans.blank?
    floorplans = community.floorplans
    floorplans.map {|floorplan| statuses << floorplan&.status&.status}
  end

  def data_provider_status(community, statuses)
    return [] if community.data_provider.blank? && community.credential.blank?
    statuses << community.credential&.status&.status
    if community.credential&.use_different_crm_provider
      statuses << community.crm_credential&.status&.status
    end
  end

  def visiting_hours_status(community, statuses)
    return [] if community.opening_hours.blank? && community.guided_opening_hours.blank?
    visiting_hours_status = []
    self_visiting_hours = community.opening_hours
    guided_visiting_hours = community.guided_opening_hours
    self_visiting_hours.map {|oh| statuses << oh&.status&.status} if self_visiting_hours.present?
    guided_visiting_hours.map {|gh| statuses << gh&.status&.status} if guided_visiting_hours.present?
  end

  def touch_gallery_media_status(community, statuses)
    return [] if community.galleries.blank?
    galleries = community.galleries
    galleries.each { |gallery| statuses << gallery&.status&.status } if galleries.present?
  end

  def hardware_specs_status(community, statuses)
    return [] if community.design.blank?
    if !community.design.status.nil?
      statuses << community&.design&.status&.status
    else
      statuses << community&.design&.status
    end
  end

  def home_page_media_status(community, statuses)
    return [] if community.design.blank? && community.design&.home_page_images.blank? && community.design&.home_page_video.blank?
    home_page_images = community.design.home_page_images
    home_page_video = community.design.home_page_video
    home_page_images.map {|hp_img| statuses << hp_img&.status&.status} if home_page_images.present?
    if home_page_video.present?
      statuses << home_page_video&.status&.status if home_page_video.present?
    end
  end

  def tour_stops_status(community, statuses)
    return [] if community.tour&.tour_stops.blank?
    tour_stops = community.tour&.tour_stops
    tour_stops.map do |ts|
      if ts.status.present?
        statuses << ts&.status&.status
      end
    end
  end

  def lock_providers_status(community, statuses)
    return [] if community.zerv.blank? && community.latch.blank? && community.dwelo.blank? && community.edge_state.blank? && community&.edge_state&.remote_locks.blank?
    
    locks_status = []

    zerv = community.zerv
    latch = community.latch
    dwelo = community.dwelo
    remote_locks = community.edge_state&.remote_locks

    statuses << zerv&.status&.status if zerv.present?
    statuses << latch&.status&.status if latch.present?
    statuses << dwelo&.status&.status if dwelo.present?

    unless remote_locks.nil?
      remote_locks.each {|remote_lock| statuses << remote_lock&.status.status if !remote_lock.status.nil?}
    end
  end

end
