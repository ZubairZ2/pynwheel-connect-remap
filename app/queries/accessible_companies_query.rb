# Companies the given user is allowed to see, as a relation.
#
# Mirrors the role branches of CompaniesController#index. The HTML path sorts
# and filters in Ruby (`alphabetical_sort`); this returns an ordered, filterable
# relation instead, so the Pynwheel Connect listing can page in SQL and load
# only the rows one page needs.
class AccessibleCompaniesQuery
  def initialize(user, params = {})
    @user = user
    @params = params
  end

  def call
    scope = base_scope.where.not(name: DUMMY_COMMUNITY_NAME)
    scope = apply_search(scope)

    scope.order(Arel.sql('LOWER(companies.name) ASC'), id: :asc)
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
    # email, and the PMS providers shown in the provider column.
    def apply_search(scope)
      term = params[:q].to_s.strip.downcase
      return scope if term.blank?

      scope.where(
        'LOWER(companies.name) LIKE :term OR LOWER(companies.email) LIKE :term ' \
        "OR LOWER(array_to_string(companies.data_providers, ' ')) LIKE :term",
        term: "%#{term}%"
      )
    end
end
