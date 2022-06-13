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
    communities = pynwheel_launch_access(communities)
    communities = distinct_user_communities(communities)
    communities = communities_by_search(communities) if search_params
    communities.order(created_at: :desc)
  end

  def pynwheel_launch_access(communities)
    return unless communities.present?
    community_users_ids = communities.joins(:community).where('communities.pynwheel_launch_access = ? ', 'true')
    CommunityUser.where(id: community_users_ids)
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

  def search_by_status(collection, statuses)
    selected_communities = []
    statuses.values.each do |status|
      communities_id = collection.pluck(:community_id).uniq
      communities_collection = Community.includes(:status, :community_users, design: [:status, {home_page_images: :status}, {home_page_video: :status}], sitemap: :status, company: :status, floorplates: :status, floorplans: :status, credential: :status, crm_credential: :status, opening_hours: :status, guided_opening_hours: :status, galleries: :status, zerv: :status, latch: :status, dwelo: :status, edge_state: [remote_locks: :status]).where(id: communities_id)
      communities_collection.each do |community|
        get_communities_statuses(community, status, selected_communities)
      end
    end
    selected_communities
    communities = CommunityUser.where(id:selected_communities.pluck(:id))
  end

  def get_communities_statuses(community, status, selected_communities)
    statuses = []

    statuses << company_status(community)

    statuses << community_status(community)
    
    statuses << property_map_status(community)
    
    statuses << floorplan_status(community)
    
    statuses << data_provider_status(community)
    
    statuses << visiting_hours_status(community) if community.self_tour
      
    statuses << touch_gallery_media_status(community) if community.touchscreen_app

    statuses << hardware_specs_status(community) if community.touchscreen_app
    
    statuses << lock_providers_status(community) if community.self_tour

    statuses << home_page_media_status(community) if community.touchscreen_app
    if status.eql?(IN_PROGRESS)
      received_status = status_value_check(status)
      if statuses.any?{|x| x.eql?(received_status) || x.nil?} && !statuses.all?{|x| x.eql?(received_status) || x.nil?}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(REJECTED)
      received_status = status_value_check(status)
      if statuses.any?{|x| x.eql?(received_status)} && !statuses.all?{|x| x.eql?(received_status)}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_100_CONTENT_SUBMITED) || status.eql?(PARAM_APPROVED_FOR_PRODUCTION)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.eql?("deployed")}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_NOT_STARTED)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.nil?}
        selected_communities << community.community_users.first
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

  def company_status(community)
    return nil if community&.company.status.blank?
    return community&.company&.status&.status
  end

  def community_status(community)
    return nil if community.status.blank?
    return community&.status&.status
  end

  def property_map_status(community)
    return nil if community.sitemap.blank? && community.floorplates.blank?
    status = []
    if community.is_sitemap
      sitemap = community.sitemap
      status << sitemap&.status&.status
    elsif community.has_floorplates?
      floorplates = community.floorplates
      floorplates.map {|floorplate| status << floorplate&.status&.status}
    end
    return status_check(status)
  end

  def floorplan_status(community)
    return nil if community.floorplans.blank?
    floorplans = community.floorplans
    floorplan_status = floorplans.map {|floorplan| floorplan&.status&.status rescue nil}
    return status_check(floorplan_status)
  end

  def data_provider_status(community)
    return nil if community.data_provider.blank? && community.credential.blank?
    data_provider_status = []
    data_provider_status << community.credential&.status&.status
    if community.credential&.use_different_crm_provider
      data_provider_status << community.crm_credential&.status&.status
    end
    return status_check(data_provider_status)
  end

  def visiting_hours_status(community)
    return nil if community.opening_hours.blank? && community.guided_opening_hours.blank?
    visiting_hours_status = []
    self_visiting_hours = community.opening_hours
    guided_visiting_hours = community.guided_opening_hours
    self_visiting_hours.map {|oh| visiting_hours_status << oh&.status&.status} if self_visiting_hours.present?
    guided_visiting_hours.map {|gh| visiting_hours_status << gh&.status&.status} if guided_visiting_hours.present?
    status_check(visiting_hours_status)
  end

  def touch_gallery_media_status(community)
    return nil if community.galleries.blank?
    galleries = community.galleries
    gallery_media_status = galleries.map { |gallery| gallery&.status&.status rescue nil } if galleries.present?
    return status_check(gallery_media_status)
  end

  def hardware_specs_status(community)
    return nil if community.design.blank?
    hardware_spec = community.design.pynwheel_touch_hardware_spec
    hardware_status = hardware_spec.present? ? community&.design&.status&.status : nil
    hardware_status
  end

  def home_page_media_status(community)
    return nil if community.design.blank? && community.design&.home_page_images.blank? && community.design&.home_page_video.blank?
    home_page_images = community.design.home_page_images
    home_page_video = community.design.home_page_video
    home_page_medias_status = []
    home_page_images.each {|hp_img| home_page_medias_status << hp_img&.status&.status rescue nil} if home_page_images.present?
    home_page_medias_status << home_page_video&.status&.status rescue nil if home_page_video.present?
    status = status_check(home_page_medias_status)
    status
  end

  def lock_providers_status(community)
    return nil if community.zerv.blank? && community.latch.blank? && community.dwelo.blank? && community.edge_state.blank? && community&.edge_state&.remote_locks.blank?
    locks_status = []
    
    zerv = community.zerv
    latch = community.latch
    dwelo = community.dwelo
    remote_locks = community.edge_state&.remote_locks

    locks_status << zerv&.status&.status rescue nil if zerv.present?
    locks_status << latch&.status&.status rescue nil if latch.present?
    locks_status << dwelo&.status&.status rescue nil if dwelo.present?
    
    unless remote_locks.nil?
      remote_locks.each {|remote_lock| locks_status << remote_lock&.status&.status rescue nil}
    end

    status = status_check(locks_status)
    status
  end

  def status_check(statuses)
    if !statuses.empty?
      return REJECTED if statuses.any?{|x| x.eql?(REJECTED)}
      return SUBMITTED if statuses.all?{|x| x.eql?(SUBMITTED)}
      return APPROVED if statuses.all?{|x| x.eql?(APPROVED)}
      return IN_PROGRESS if statuses.any? {|x| x.eql?(IN_PROGRESS) || x.eql?(nil)}
      return DEPLOYED if statuses.all?{|x| x.eql?(DEPLOYED)}
    else
      return nil
    end
  end

end
