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
  has_many :latch_guests, dependent: :destroy
  has_many :zerv_guests, dependent: :destroy
  has_many :igloohome_guests, dependent: :destroy
  has_many :lock_histories, dependent: :destroy
  has_many :prospects, dependent: :destroy
  has_many :user_stripes, dependent: :destroy

  has_one :feedbacks
  
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :first_name, presence: true
  validates :last_name, presence: true
  validates :email, presence: true
  # validates :phone_number, presence: true
  # validates :desired_bedroom, :numericality => { greater_than_or_equal_to: 0, less_than: 10 }

  after_update :crop_user_image

  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :id_card, AvatarUploader
  def crop_user_image
    begin
      image.recreate_versions! if (image.present? and crop_image_bit and !crop_image_bit.nil)
      id_card.recreate_versions! if (id_card.present? and !crop_image_bit and !crop_image_bit.nil)
    rescue => exception
      
    end
  end
  attr_accessor :crop_image_bit
  def crop_image_bit
    @crop_image_bit
  end
end
