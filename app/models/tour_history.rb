class TourHistory < ApplicationRecord
  belongs_to :tour_user

  # after_update :send_notifications
  # after_save :send_arrival_email

  def send_arrival_email
  	# NotificationMailer.tour_history_mails("Visitor Has Arrived", "Tour has begun")
  	NotificationMailer.tour_history_mail("Visitor Has Arrived", "Tour has begun")
  end

  private

  def send_notifications  	
  end


end
