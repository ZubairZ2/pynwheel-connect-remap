# == Schema Information
#
# Table name: community_users
#
#  id           :integer          not null, primary key
#  community_id :integer
#  user_id      :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class CommunityUser < ApplicationRecord
  belongs_to :user
  belongs_to :community
  amoeba do
    enable
  end
end
