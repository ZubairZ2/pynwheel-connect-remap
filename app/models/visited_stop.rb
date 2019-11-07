# == Schema Information
#
# Table name: visited_stops
#
#  id           :integer          not null, primary key
#  tour_user_id :integer
#  image        :string
#  tour_stop_id :integer
#  description  :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  tour_id      :integer
#  device_id    :string
#  tour_key     :string
#

class VisitedStop < ApplicationRecord
  belongs_to :tour_user
  mount_uploader :image, AvatarUploader


end
