# == Schema Information
#
# Table name: temporary_images
#
#  id           :integer          not null, primary key
#  image        :text
#  position     :integer
#  community_id :integer
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class TemporaryImage < ApplicationRecord
	belongs_to :community
end
