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
  has_many :schedual_tours, dependent: :destroy
  has_many :chatrooms, dependent: :destroy
  has_many :as_guests, dependent: :destroy
  has_many :igloo_guests, dependent: :destroy
  has_many :lock_histories, dependent: :destroy
  has_many :prospects, dependent: :destroy
  
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

  after_update :crop_user_image

  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :id_card, AvatarUploader
  def crop_user_image
    begin
      image.recreate_versions! if image.present?
    rescue => exception
      
    end
  end
  attr_accessor :crop_image_bit
  def crop_image_bit
    @crop_image_bit
  end
end
