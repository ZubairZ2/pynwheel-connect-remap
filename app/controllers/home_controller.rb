class HomeController < ApplicationController
  include GridPagination

  def index
    @filter = CommunityFilterQuery.new(visible_communities, filter_params)
    # includes(:company) is what keeps the Company column from firing one query
    # per row; the filter's own join covers searching and sorting on it.
    @communities = paginate_grid(@filter.results.includes(:company), @filter)
    @unit_counts = unit_counts_for(@communities)
    @filter_options = community_filter_options

    # The toolbar re-requests this action on every keystroke and sorts and pages
    # through it too; sending back only the results fragment keeps the page
    # chrome out of every one of those responses.
    return render partial: "communities_table", layout: false if request.xhr?

    handle_code_grant_authorization(request&.headers['referer']) if params["code"].present?
  end

  private

  # Every property this user is allowed to see, before the toolbar narrows it.
  # Returns a relation rather than an array so the filtering, sorting and paging
  # all happen in one query - this used to load the whole estate to sort it.
  def visible_communities
    case
    when current_user.is_super_admin?
      # Deliberately not limited to active properties: an admin needs the locked
      # ones too, and the Status filter is how they say which they want.
      Community.real_properties
    when current_user.is_dwelo_admin?
      Community.active_properties.where(id: dwelo_visible_ids)
    when current_user.is_company_admin?
      current_user.company&.communities&.active_properties || Community.none
    when current_user.is_regional_admin?
      current_user.region.communities.active_properties
    else
      current_user.communities.active_properties
    end
  end

  # A Dwelo admin sees what they are assigned plus everything created under the
  # Dwelo umbrella, whether the property or its whole company was created there.
  def dwelo_visible_ids
    dwelo_user_ids = User.where(role: "Dwelo admin").ids

    current_user.communities.ids |
      Community.where(creator_id: dwelo_user_ids).ids |
      Community.joins(:company).where(companies: { creator_id: dwelo_user_ids }).ids
  end

  def filter_params
    params.permit(*CommunityFilterQuery::FILTER_KEYS, :sort, :dir, :per_page)
  end

  # One grouped count for the whole page rather than a COUNT per row. The
  # subquery the filter sorts on is not carried onto the paginated rows, so the
  # displayed figure is fetched here and looked up by id in the view.
  def unit_counts_for(communities)
    Unit.where(community_id: communities.map(&:id)).group(:community_id).count
  end

  # The values actually present behind each dropdown, so the toolbar never
  # offers a choice that matches nothing. Scoped to what this user can see -
  # a company admin has no business reading the full company list off a filter.
  def community_filter_options
    scope = visible_communities

    {
      companies: Company.where(id: scope.select(:company_id)).order(:name).pluck(:name, :id),
      regions: Region.where(id: scope.select(:region_id)).order(:name).pluck(:name, :id),
      groups: CommunityGroup.where(id: scope.select(:community_group_id)).order(:name).pluck(:name, :id),
      states: scope.distinct.where.not(state: [nil, ""]).order(:state).pluck(:state),
      providers: scope.distinct.where.not(data_provider: [nil, ""]).order(:data_provider).pluck(:data_provider)
    }
  end

  def handle_code_grant_authorization_for(brand)
    community_id = session[:community_id]
    return unless community_id.present?

    session[:authorization_code] = params['code']

    if brand === "edgestate"
      redirect_to "/communities/#{community_id}/edgestate_accounts/edgestate_code_grant_authorization"
    elsif brand === "igloohome"
      redirect_to "/communities/#{community_id}/igloohome_v2_accounts/igloohome_code_grant_authorization"
    end
  end

  def handle_code_grant_authorization(brand_url)
    if brand_url&.include?("edgestate")
      handle_code_grant_authorization_for('edgestate')
    elsif brand_url&.include?("igloohome")
      handle_code_grant_authorization_for('igloohome')
    end
  end
end
