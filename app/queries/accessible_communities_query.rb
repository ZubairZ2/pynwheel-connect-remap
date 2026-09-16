# Communities the given user is allowed to see, using the same role rules the
# legacy Home screen ("All communities are listed here") applies.
#
# Extracted so the Pynwheel Connect Properties listing (communities#index.json)
# and the legacy Home screen agree on scope without duplicating the rules.
class AccessibleCommunitiesQuery
  PRELOADS = [:company, :region, :credential, { tour: :tour_stops }].freeze

  def initialize(user)
    @user = user
  end

  def call
    scope.includes(*PRELOADS).order(Arel.sql('LOWER(communities.name) ASC'))
  end

  private

    attr_reader :user

    def scope
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
end
