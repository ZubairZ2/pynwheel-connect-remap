# == Schema Information
#
# Table name: tour_users
#
#  id           :integer          not null, primary key
#  name         :string
#  phone_number :integer
#  email        :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class TourUser < ApplicationRecord
  has_many :visited_stops, dependent: :destroy

  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :id_card, AvatarUploader
end
