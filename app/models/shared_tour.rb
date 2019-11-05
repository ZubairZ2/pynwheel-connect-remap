# == Schema Information
#
# Table name: shared_tours
#
#  id             :integer          not null, primary key
#  name           :string
#  recipient_name :string
#  phone          :string
#  email          :string
#  tour_id        :integer
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#

class SharedTour < ApplicationRecord
end
