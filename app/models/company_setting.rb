class CompanySetting < ApplicationRecord
  belongs_to :company
  after_save :create_community, if: ->(obj) { obj.pynwheel_launch_access_changed? }

  def create_community
    if pynwheel_launch_access && company.communities.count === 0
      community = company.communities.find_or_create_by!(name: DUMMY_COMMUNITY_NAME, pynwheel_launch_access: true)
      CommunityUser.find_or_create_by(community_id: community.id, user_id: company.creator_id)
    end
  end

end
