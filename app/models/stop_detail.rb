# == Schema Information
#
# Table name: stop_details
#
#  id           :integer          not null, primary key
#  tour_stop_id :integer
#  description  :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class StopDetail < ApplicationRecord
  # has_paper_trail
end
