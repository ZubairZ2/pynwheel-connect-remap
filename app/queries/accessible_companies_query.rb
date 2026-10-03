# Companies the given user is allowed to see, as a relation.
#
# Mirrors the role branches of CompaniesController#index. The HTML path sorts
# and filters in Ruby (`alphabetical_sort`); this returns an ordered, filterable
# relation instead, so the Pynwheel Connect listing can page in SQL and load
# only the rows one page needs.
class AccessibleCompaniesQuery
  # The Status column is derived from `inactivate` (see the Connect listing
  # generator), so searching it means matching the term against these labels.
  # A prefix match, so that "active" does not also find "inactive".
  STATUS_LABELS = { 'active' => false, 'inactive' => true }.freeze

  # The PMS Provider filter's value for "no provider configured" (as the
  # Properties listing's data_provider filter spells it).
  NO_PROVIDER = 'none'.freeze

  # The Properties filter: companies with at least one property, or none.
  PROPERTY_STATES = %w[with without].freeze

  # The listing's sortable columns (`sort` / `dir`, see ListingSort), each on
  # the value its cell shows: the name, Active before Inactive, the PMS
  # providers' labels in their stored order, and the Properties count (the
  # same real_properties count Connect::CompanySerializer puts in the row).
  # Built on first use: the count's SQL comes from a relation, which needs a
  # database connection, so it cannot be a constant evaluated at class load.
  def self.sorts
    @sorts ||= {
      'name' => 'LOWER(companies.name)',
      'status' => 'COALESCE(companies.inactivate, FALSE)',
      'pms_provider' => "(SELECT string_agg(#{ListingSort.provider_label_sql('providers.slug')}, ', ' ORDER BY providers.position) " \
                        'FROM unnest(companies.data_providers) WITH ORDINALITY AS providers(slug, position) ' \
                        "WHERE NULLIF(TRIM(providers.slug), '') IS NOT NULL)",
      'properties' => "(#{Community.real_properties.where('communities.company_id = companies.id').select('COUNT(*)').to_sql})"
    }.freeze
  end

  def initialize(user, params = {})
    @user = user
    @params = params
  end

  # Search and the three filters — Status, PMS Provider, Properties — in SQL,
  # so the page stays one bounded query. Values within a filter are ORed;
  # filters are ANDed, as on the Properties listing.
  def call
    scope = apply_search(accessible)
    scope = apply_status(scope)
    scope = apply_provider(scope)
    scope = apply_properties(scope)

    ListingSort.new(self.class.sorts, params).apply(scope, Arel.sql('LOWER(companies.name) ASC'), id: :asc)
  end

  # Every company the user may see, before search. The listing header's totals
  # come from this, so they hold still while the user types.
  def accessible
    base_scope.where.not(name: DUMMY_COMMUNITY_NAME)
  end

  # The PMS Provider filter's options: every provider slug a company in scope
  # names, plus `none` when some name no provider at all. One page of rows
  # cannot derive these, so the listing sends them in `meta`.
  def provider_options
    slugs = accessible.pluck(:data_providers).flatten.compact_blank.map(&:to_s).uniq.sort
    slugs << NO_PROVIDER if accessible.where(NO_PROVIDER_SQL).exists?
    slugs
  end

  # Properties across those companies, counted the same way as each row's
  # Properties column (Connect::CompanySerializer).
  def property_total
    Community.real_properties.where(company_id: accessible.select(:id)).count
  end

  # A company with no provider: a NULL array, an empty one, or one holding only blanks.
  NO_PROVIDER_SQL = "COALESCE(array_length(array_remove(companies.data_providers, ''), 1), 0) = 0".freeze

  private

    attr_reader :user, :params

    # Each filter takes one value or several (`status=active,inactive`, or
    # `status[]=…`), as the Properties listing's filters do.
    def list_param(key)
      Array(params[key]).flat_map { |value| value.to_s.split(',') }.map(&:strip).reject(&:blank?).uniq
    end

    def apply_status(scope)
      statuses = list_param(:status) & STATUS_LABELS.keys
      return scope if statuses.empty?

      scope.where('COALESCE(companies.inactivate, FALSE) IN (:flags)', flags: statuses.map { |status| STATUS_LABELS[status] })
    end

    # The slugs are matched inside the array column as its own elements, so
    # "yardi" does not also find "yardirentcafe".
    def apply_provider(scope)
      providers = list_param(:pms_provider)
      return scope if providers.empty?

      clauses = []
      clauses << NO_PROVIDER_SQL if providers.delete(NO_PROVIDER)
      clauses << 'EXISTS (SELECT 1 FROM unnest(companies.data_providers) AS provider(slug) WHERE provider.slug IN (:providers))' if providers.any?

      scope.where(clauses.join(' OR '), providers: providers)
    end

    # Counted the way the row's Properties column counts them (real_properties).
    def apply_properties(scope)
      states = list_param(:properties) & PROPERTY_STATES
      return scope if states.empty? || states.size == PROPERTY_STATES.size

      exists = "EXISTS (#{Community.real_properties.where('communities.company_id = companies.id').select('1').to_sql})"
      scope.where(states.include?('with') ? exists : "NOT #{exists}")
    end

    def base_scope
      if user.is_super_admin?
        Company.all
      elsif user.is_dwelo_admin?
        Company.where(creator_id: User.where(role: 'Dwelo admin').ids)
      else
        Company.where(id: user.company_id)
      end
    end

    # Matches the columns the Companies listing searches on: name, contact
    # email, the PMS providers shown in the provider column, and the status.
    def apply_search(scope)
      term = params[:q].to_s.strip.downcase
      return scope if term.blank?

      sql = 'LOWER(companies.name) LIKE :term OR LOWER(companies.email) LIKE :term ' \
            "OR LOWER(array_to_string(companies.data_providers, ' ')) LIKE :term"
      statuses = STATUS_LABELS.select { |label, _| label.start_with?(term) }.values
      sql += ' OR COALESCE(companies.inactivate, FALSE) IN (:statuses)' unless statuses.empty?

      scope.where(sql, term: "%#{term}%", statuses: statuses)
    end
end
