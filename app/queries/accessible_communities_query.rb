# Communities the given user is allowed to see, using the same role rules the
# legacy Home screen ("All communities are listed here") applies.
#
# Extracted so the Pynwheel Connect Properties listing (communities#index.json)
# and the legacy Home screen agree on scope without duplicating the rules.
#
# The listing's search and filters are applied here, in SQL, so that paging can
# also happen in SQL: only one page of rows is ever loaded and serialized.
class AccessibleCommunitiesQuery
  # `preload` rather than `includes`: preloading issues separate queries, so
  # LIMIT/OFFSET keep applying to communities alone. An `includes` that turned
  # into a JOIN would page over joined rows instead.
  PRELOADS = [:company, :region, :credential, { tour: :tour_stops }].freeze

  # The lifecycle stage is derived from milestone dates, most advanced first
  # (see Connect::PropertySerializer#stage), so each stage asserts its own date
  # and the absence of every later one.
  STAGE_CONDITIONS = {
    'released' => 'communities.released_date IS NOT NULL',
    'approval' => 'communities.released_date IS NULL ' \
                  'AND communities.submitted_final_approval_date IS NOT NULL',
    'production' => 'communities.released_date IS NULL ' \
                    'AND communities.submitted_final_approval_date IS NULL ' \
                    'AND communities.production_started_date IS NOT NULL',
    'activated' => 'communities.released_date IS NULL ' \
                   'AND communities.submitted_final_approval_date IS NULL ' \
                   'AND communities.production_started_date IS NULL ' \
                   'AND communities.date_activated IS NOT NULL',
    # installed: no milestone date recorded yet
    'installed' => 'communities.released_date IS NULL ' \
                   'AND communities.submitted_final_approval_date IS NULL ' \
                   'AND communities.production_started_date IS NULL ' \
                   'AND communities.date_activated IS NULL'
  }.freeze

  # Mirrors Connect::PropertySerializer#products. Touch and Tour have real
  # boolean columns; Maps only exists as a flag inside `product_options`, a
  # jsonb column holding a JSON *string*, which has to be unwrapped (#>> '{}')
  # before it can be traversed.
  PRODUCT_CONDITIONS = {
    'touch' => 'communities.touchscreen_app = TRUE',
    'tour' => 'communities.self_tour = TRUE',
    'maps' => "communities.enable_sdk_map = TRUE OR " \
              "((communities.product_options #>> '{}')::jsonb -> 'product_options' ->> 'pynwheel_maps') = 'true'"
  }.freeze

  # The Data Provider filter's option for communities with no provider set.
  NO_DATA_PROVIDER = 'none'.freeze

  def initialize(user, params = {})
    @user = user
    @params = params
  end

  def call
    scope = base_scope.preload(*PRELOADS)
    scope = apply_search(scope)
    scope = apply_stage(scope)
    scope = apply_company(scope)
    scope = apply_product(scope)
    scope = apply_data_provider(scope)

    scope.order(Arel.sql('LOWER(communities.name) ASC'), id: :asc)
  end

  # Companies present anywhere in this user's accessible scope — the options for
  # the listing's company filter. Deliberately not narrowed by the current
  # filters, so the dropdown does not shrink as the user pages or searches.
  def company_options
    Company
      .where(id: base_scope.select(:company_id))
      .order(Arel.sql('LOWER(companies.name) ASC'))
      .pluck(:id, :name)
      .map { |id, name| { id: id, name: name } }
  end

  # The Data Provider filter's options: every provider slug in the user's scope,
  # plus NO_DATA_PROVIDER when some communities have none. Unfiltered, like
  # company_options. The frontend labels and sorts them.
  def data_provider_options
    providers = base_scope.where.not(data_provider: [nil, '']).distinct.pluck(:data_provider).sort
    providers << NO_DATA_PROVIDER if base_scope.where(data_provider: [nil, '']).exists?
    providers
  end

  # How many communities the user can see before search and filters: the
  # listing header's total.
  def scope_count
    base_scope.count
  end

  private

    attr_reader :user, :params

    # Memoized: the listing, both filter option lists and the total all start
    # here, and the Dwelo branch costs several queries to build.
    def base_scope
      @base_scope ||= case
      when user.is_super_admin?
        Community.real_properties
      when user.is_dwelo_admin?
        ids = dwelo_visible_community_ids
        ids.present? ? Community.active_properties.where(id: ids) : Community.none
      when user.is_company_admin?
        user.company.present? ? user.company.communities.active_properties : Community.none
      when user.is_regional_admin?
        user.region.present? ? user.region.communities.active_properties : Community.none
      else
        user.communities.active_properties
      end
    end

    def dwelo_visible_community_ids
      dwelo_admin_ids = User.where(role: 'Dwelo admin').ids
      assigned = user.communities.ids
      created_by_dwelo = Community.where(creator_id: dwelo_admin_ids).ids
      under_dwelo_companies = Community.joins(:company).where(companies: { creator_id: dwelo_admin_ids }).ids

      (assigned + created_by_dwelo + under_dwelo_companies).uniq
    end

    # The columns the Properties listing searches on: property name, company
    # name, city/state, and the PMS provider.
    def apply_search(scope)
      term = params[:q].to_s.strip.downcase
      return scope if term.blank?

      scope
        .left_joins(:company)
        .where(
          'LOWER(communities.name) LIKE :term OR LOWER(companies.name) LIKE :term ' \
          'OR LOWER(communities.city) LIKE :term OR LOWER(communities.state) LIKE :term ' \
          'OR LOWER(communities.data_provider) LIKE :term',
          term: "%#{term}%"
        )
    end

    # Each filter takes one value or several (`stage=released,approval`, or
    # `stage[]=…`). Values within a filter are ORed; filters are ANDed.
    def list_param(key)
      Array(params[key]).flat_map { |value| value.to_s.split(',') }.map(&:strip).reject(&:blank?).uniq
    end

    def apply_stage(scope)
      stages = list_param(:stage) & STAGE_CONDITIONS.keys
      return scope if stages.empty?

      scope.where(stages.map { |stage| "(#{STAGE_CONDITIONS[stage]})" }.join(' OR '))
    end

    def apply_company(scope)
      company_ids = list_param(:company_id).map(&:to_i).select(&:positive?)
      return scope if company_ids.empty?

      scope.where(company_id: company_ids)
    end

    def apply_product(scope)
      products = list_param(:product) & PRODUCT_CONDITIONS.keys
      return scope if products.empty?

      scope.where(products.map { |product| "(#{PRODUCT_CONDITIONS[product]})" }.join(' OR '))
    end

    def apply_data_provider(scope)
      providers = list_param(:data_provider)
      return scope if providers.empty?

      clauses = []
      clauses << "COALESCE(communities.data_provider, '') = ''" if providers.delete(NO_DATA_PROVIDER)
      clauses << 'communities.data_provider IN (:providers)' if providers.any?

      scope.where(clauses.join(' OR '), providers: providers)
    end
end
