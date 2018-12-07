# == Schema Information
#
# Table name: favorites
#
#  id           :integer          not null, primary key
#  community_id :integer
#  session_id   :string
#  unit_ids     :jsonb
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class Favorite < ApplicationRecord
	
end
