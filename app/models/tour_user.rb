# == Schema Information
#
# Table name: tour_users
#
#  id                 :integer          not null, primary key
#  name               :string
#  email              :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  credit_card_number :string
#  card_expiry        :string
#  phone_number       :string
#  image              :string
#  id_card            :string
#  id_selfie_mismatch :boolean          default(TRUE)
#

class TourUser < ApplicationRecord
	# to include routes in here so we can send in email as link
	include Routeable

  has_many :visited_stops, dependent: :destroy
  has_many :tour_histories, dependent: :destroy
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }


  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :id_card, AvatarUploader
  

end
