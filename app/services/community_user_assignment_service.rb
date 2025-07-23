# app/services/community_user_assignment_service.rb
class CommunityUserAssignmentService
  def initialize(community)
    @community = community
    @company = community.company
    @region = community.region
  end

  def assign_admin_users
    return unless @company

    # Get all user_ids from existing community_user records under the same company
    existing_user_ids = CommunityUser
                          .where(community_id: @company.communities.pluck(:id))
                          .pluck(:user_id)
                          .uniq

    return if existing_user_ids.empty?

    users = User.where(id: existing_user_ids)
    existing_user_ids_for_community = @community.community_users.pluck(:user_id).to_set

    users.each do |user|
      next if existing_user_ids_for_community.include?(user.id)

      if user.is_super_admin? || user.is_company_admin?
        @community.community_users.create(user_id: user.id)
      elsif user.is_regional_admin? && has_region_access?(user)
        @community.community_users.create(user_id: user.id)
      end
    end
  end

  private

  def has_region_access?(user)
    return false unless @region

    CommunityUser
      .joins(:community)
      .where(user_id: user.id, communities: { region_id: @region.id })
      .exists?
  end
end
