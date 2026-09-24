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

  def initialize(user, params = {})
    @user = user
    @params = params
  end

  def call
    scope = apply_search(accessible)

    scope.order(Arel.sql('LOWER(companies.name) ASC'), id: :asc)
  end

  # Every company the user may see, before search. The listing header's totals
  # come from this, so they hold still while the user types.
  def accessible
    base_scope.where.not(name: DUMMY_COMMUNITY_NAME)
  end

  # Properties across those companies, counted the same way as each row's
  # Properties column (Connect::CompanySerializer).
  def property_total
    Community.real_properties.where(company_id: accessible.select(:id)).count
  end

  private

    attr_reader :user, :params

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
