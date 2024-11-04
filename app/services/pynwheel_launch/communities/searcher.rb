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
      communities = user&.community_users
    elsif user.is_super_admin?
      communities = CommunityUser.all
    elsif user.is_regional_admin?
      ids = user&.region&.communities&.ids
      communities = CommunityUser.where(community_id: ids)
    elsif user.is_company_admin?
      ids = user&.company&.communities.ids
      communities = CommunityUser.where(community_id: ids)
    elsif user.is_dwelo_admin?
      assigned_communities_ids = user.communities.ids # all assinged communities
      dwelo_communities_ids = Community.where(creator_id: User.where(role: "Dwelo admin").ids).ids # all communities created by any dwelo admin
      dwelo_companies_communities = Community.joins(:company).where(companies: {creator_id: User.where(role: "Dwelo admin").ids}).ids # all communities under dwelo_companies (either created by dwelo_admin or super_admin)
      ids = (assigned_communities_ids + dwelo_communities_ids + dwelo_companies_communities).uniq
      communities = CommunityUser.where(community_id: ids)
    elsif user.is_community_admin? || user.is_community_manager?
      communities = user&.community_users
    else
      communities = user&.community_users
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
    if params[:keyword].present?
      query_string = "%#{params[:keyword].strip.downcase}%"
      company_ids = Company.where('lower(name) like ?' , query_string).pluck(:id)
      collection = collection.joins(:community).where('lower(communities.name) like ? OR communities.company_id in (?)' , query_string , company_ids)
    end
    collection = search_by_products(collection , JSON.parse(params[:products])) if params[:products].present?
    collection = search_by_status(collection , JSON.parse(params[:status])) if params[:status].present?
    collection
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
      if product == "pynwheel_access"
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

      communities_collection = Community.includes(:status, :community_users, design: [:status, {home_page_images: :status}, {home_page_video: :status}], sitemap: :status, company: :status, floorplates: :status, floorplans: :status, credential: :status, crm_credential: :status, opening_hours: :status, guided_opening_hours: :status, galleries: :status, zerv: :status, latch: :status, dwelo: :status, schlage: :status, yale: :status, launch_remote: :status).where(id: communities_id)
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
    
    statuses << floorplan_status(community) if community.floorplans.count.positive?
    
    statuses << data_provider_status(community)
    if community.product_options.nil?
      self_tour = community.self_tour
      pynwheel_touch = community.touchscreen_app
    else
      product_options = JSON.parse(community.product_options)
      self_tour = product_options["product_options"]["self_tour"]["is_enabled"]
      pynwheel_touch = product_options["product_options"]["pynwheel_touch"]["is_enabled"]
    end
    statuses << visiting_hours_status(community) if self_tour

      
    statuses << touch_gallery_media_status(community) if pynwheel_touch

    statuses << tour_stops_status(community) if self_tour
    
    statuses << lock_providers_status(community) if self_tour

    statuses << home_page_media_status(community) if pynwheel_touch

    # statuses << design_direction_status(community)  if design_direction_form_require(community)

    # statuses << amenity_images_status(community)  if amenity_images_form_require(community)

    # statuses << additional_pages_status(community)  if additional_pages_form_require(community)

    # statuses << ebrochure_status(community)

    # detail_forms << hardware_spec_form # if hardware_spec_form_require
    if status.eql?(IN_PROGRESS)
      received_status = status_value_check(status)
      if statuses.any?{|x| x.eql?(received_status) || x.nil?} && !statuses.all?{|x| x.eql?(received_status) || x.nil?}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_REJECTED)
      received_status = status_value_check(status)
      if statuses.any?{|x| x.eql?(received_status)} && !statuses.all?{|x| x.eql?(received_status)}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_100_CONTENT_SUBMITED)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.eql?(RELEASED) || x.eql?(PARAM_APPROVED) || x.eql?(APPLICATION_IN_REVIEW) } && statuses.include?(received_status)
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_APPROVED)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.eql?(RELEASED) || x.eql?(APPLICATION_IN_REVIEW)} && statuses.include?(received_status)
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_RELEASED)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status)}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_NOT_STARTED)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.nil?}
        selected_communities << community.community_users.first
      end
    elsif status.eql?(APPLICATION_IN_REVIEW)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.eql?(RELEASED) } && statuses.include?(received_status)
        selected_communities << community.community_users.first
      end
    elsif status.eql?(PARAM_APPLICATION_IN_QA)
      received_status = status_value_check(status)
      if statuses.all?{|x| x.eql?(received_status) || x.eql?(RELEASED) || x.eql?(APPROVED)} && statuses.include?(received_status)
        selected_communities << community.community_users.first
      end
    end
    selected_communities
  end

  def ebrochure_status(community)
    return nil if community.favorite_setting.blank?
    status = []
    weblinks = community.favorite_setting.ebrochure_menu_buttons
    weblinks.map { |weblink| status << weblink&.status&.status } if weblinks.present?

    favorite_images = community.favorite_setting.favorite_images
    favorite_images.map { |image| status << image&.status&.status } if favorite_images.present?

    return status_check(status)
  end

  def additional_pages_status(community)
    return nil if community.webpages.blank? && community.imagepages.blank?

    status = []
    webpages = community.webpages
    webpages.map {|webpage| status << webpage&.status&.status} if webpages.present?

    imagepages = community.imagepages
    imagepages.map {|imagepage| status << imagepage&.status&.status} if imagepages.present?

    return status_check(status)
  end

  def design_direction_status(community)
    return nil if community&.design_direction&.status.blank?
    return community&.design_direction&.status&.status
  end

  def amenity_images_status(community)
    return nil if community.amenities.blank?
    status = []
      amenities = community.amenities
      amenities.map {|amenity| status << amenity&.status&.status}
    return status_check(status)
  end

  def status_value_check(status)
    if status.eql?(PARAM_NOT_STARTED) || status.eql?(IN_PROGRESS)
      return "in_progress"
    elsif status.eql?(PARAM_100_CONTENT_SUBMITED)
      return "submitted"
    elsif status.eql?(PARAM_APPROVED)
      return "approved"
    elsif status.eql?(PARAM_REJECTED)
      return REJECTED
    elsif status.eql?(PARAM_RELEASED)
      return RELEASED
    elsif status.eql?(APPLICATION_IN_REVIEW)
      return "in_review"
    elsif status.eql?(PARAM_APPLICATION_IN_QA)
      return APPLICATION_IN_QA
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
    credential = Credential.where(community_id: community.id).order(updated_at: :desc).first
    data_provider_status << credential&.status&.status
    if community.credential&.use_different_crm_provider
      data_provider_status << community.crm_credential&.status&.status
    end
    return status_check(data_provider_status)
  end

  def visiting_hours_status(community)
    return nil if community.opening_hours.blank? && community.guided_opening_hours.blank?
    self_visiting_hours_status = []
    guided_visiting_hours_status = []
    self_visiting_hours = community.opening_hours
    guided_visiting_hours = community.guided_opening_hours
    self_visiting_hours.map {|oh| self_visiting_hours_status << oh&.status&.status} if self_visiting_hours.present?
    guided_visiting_hours.map {|gh| guided_visiting_hours_status << gh&.status&.status} if guided_visiting_hours.present?
    visiting_hours_status = guided_visiting_hours_status.compact + self_visiting_hours_status.compact
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

  def tour_stops_status(community)
    return nil if community.community_tour&.tour_stops.blank?
    tour_stops = community.community_tour&.tour_stops
    
    tour_stops_status = tour_stops.map {|ts| ts&.status&.status rescue nil}
    status = status_check(tour_stops_status)
    status
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
    return nil if community.zerv.blank? && community.latch.blank? && community.dwelo.blank? && community.edge_state.blank? && community&.launch_remote.blank? && community&.yale.blank? && community&.schlage.blank? && community.other_locks.blank? && community.igloohome.blank?
    locks_status = []
    zerv = community.zerv
    latch = community.latch
    dwelo = community.dwelo
    remote_locks = community.launch_remote
    yale_locks = community&.yale
    schlage_locks = community&.schlage
    igloohome_lock = community.igloohome
    other_locks = community.other_locks

    locks_status << zerv&.status&.status if zerv.present?
    locks_status << latch&.status&.status if latch.present?
    locks_status << dwelo&.status&.status if dwelo.present?
    locks_status << igloohome_lock&.status&.status if igloohome_lock.present?
    locks_status << schlage_locks&.status&.status if schlage_locks.present?
    locks_status << yale_locks&.status&.status if yale_locks.present?
    other_locks.each { |lock| locks_status << lock&.status&.status } if other_locks.present?
    locks_status << remote_locks&.status&.status unless remote_locks.nil?
    status = status_check(locks_status)
    status
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

  def design_direction_form_require(community)
    return false if community.product_options.nil?
    products = JSON.parse(community.product_options)
    return true if products["product_options"]["pynwheel_touch"]["is_enabled"] && (products["product_options"]["pynwheel_touch"]["options"]["design_style"].eql?("Modernist Horizontal") || products["product_options"]["pynwheel_touch"]["options"]["design_style"].eql?("Modernist Vertical") || products["product_options"]["pynwheel_touch"]["options"]["design_style"].eql?("Expressionist"))
    false
  end

  def amenity_images_form_require(community)
    return false if community.product_options.nil?
    products = JSON.parse(community.product_options)
    return true if !products["product_options"]["self_tour"]["is_enabled"] && (products["product_options"]["pynwheel_touch"]["is_enabled"] || products["product_options"]["pynwheel_maps"])
    false
  end

  def additional_pages_form_require(community)
    return false if community.product_options.nil?
    products = JSON.parse(community.product_options)
    return true if !products["product_options"]["self_tour"]["is_enabled"] && products["product_options"]["pynwheel_touch"]["is_enabled"] && !products["product_options"]["pynwheel_maps"]
    false
  end

  def hardware_spec_form_require(community)
    return false if community.product_options.nil?
    products = JSON.parse(community.product_options)
    return true if products["product_options"]["pynwheel_touch"]["options"]["installation"].eql?("Yes")
    false
  end


end
