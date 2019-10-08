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
	# to include routes in here so we can send in email as link
	include Routeable

  has_many :visited_stops, dependent: :destroy
  has_many :tour_histories, dependent: :destroy
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }


  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :id_card, AvatarUploader

  after_save :send_selfie_match_link

  def send_selfie_match_link
  	if self.id_card.present? && self.image.present?
      self.id_selfie_mismatch = false
      self.save
  		email_content = "Please verify user on the following link <br/> <a href='#{manual_selfie_match_url self.id }' target='_blank'> Visitor's ID page </a>"
  		DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'arslan.mirza@intagleo.com')
  	end

  end
end
