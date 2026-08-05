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
    community_users_ids = communities.joins(:community).where('communities.pynwheel_launch_access = ? AND communities.name != ? ', 'true', DUMMY_COMMUNITY_NAME)
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

  # The dashboard status filter judges a community on the same forms, and with
  # the same roll-up, that Launch shows the client inside the community.
  def get_communities_statuses(community, status, selected_communities)
    statuses = PynwheelLaunch::Forms.core_for(community).map do |form|
      PynwheelLaunch::Forms.rolled_up_status(community, form)
    end

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

end
