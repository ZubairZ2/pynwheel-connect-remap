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

  PRODUCT_FILTERS = %w[touch tour maps].freeze
  STAGE_FILTERS = %w[installed activated production released approval].freeze

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

  private

    attr_reader :user, :params

    def base_scope
      case
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

    # The lifecycle stage is derived from milestone dates, most advanced first
    # (see Connect::PropertySerializer#stage). Each filter therefore asserts its
    # own date and the absence of every later one.
    def apply_stage(scope)
      stage = params[:stage].to_s
      return scope unless STAGE_FILTERS.include?(stage)

      case stage
      when 'released'
        scope.where.not(released_date: nil)
      when 'approval'
        scope.where(released_date: nil).where.not(submitted_final_approval_date: nil)
      when 'production'
        scope.where(released_date: nil, submitted_final_approval_date: nil)
             .where.not(production_started_date: nil)
      when 'activated'
        scope.where(released_date: nil, submitted_final_approval_date: nil, production_started_date: nil)
             .where.not(date_activated: nil)
      else # installed — no milestone date recorded yet
        scope.where(
          released_date: nil,
          submitted_final_approval_date: nil,
          production_started_date: nil,
          date_activated: nil
        )
      end
    end

    def apply_company(scope)
      company_id = params[:company_id].to_i
      return scope unless company_id.positive?

      scope.where(company_id: company_id)
    end

    # Mirrors Connect::PropertySerializer#products. Touch and Tour have real
    # boolean columns; Maps only exists as a flag inside `product_options`, a
    # jsonb column holding a JSON *string*, so it is matched as text.
    def apply_product(scope)
      product = params[:product].to_s
      return scope unless PRODUCT_FILTERS.include?(product)

      case product
      when 'touch'
        scope.where(touchscreen_app: true)
      when 'tour'
        scope.where(self_tour: true)
      else
        # `product_options` is jsonb holding a JSON string, so it has to be
        # unwrapped (#>> '{}') before it can be traversed.
        scope.where(
          "communities.enable_sdk_map = TRUE OR " \
          "((communities.product_options #>> '{}')::jsonb -> 'product_options' ->> 'pynwheel_maps') = 'true'"
        )
      end
    end
end
