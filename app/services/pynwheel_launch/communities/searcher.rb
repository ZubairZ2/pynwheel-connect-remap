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
    communities = communities_by_search(communities) if search_params
    communities.order(created_at: :desc)
  end

  def communities_by_search(collection)
    query_string = "%#{params[:keyword].strip.downcase}%" if params[:keyword].present?
    company_ids = Company.where('lower(name) like ?' , query_string).pluck(:id)
    communities = collection.joins(:community).where('lower(communities.name) like ? OR communities.company_id in (?)' , query_string , company_ids)
    communities = search_by_products(collection , JSON.parse(params[:products])) if params[:products].present?
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


end
