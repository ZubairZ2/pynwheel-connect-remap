class TourHistory < ApplicationRecord
  belongs_to :tour_user

  after_update :send_notifications
  after_create :send_arrival_email

  private

  def send_notifications
  	
  	if time_difference >= 1
  		mail_content = get_alert_message('lengthy_stay')
  		mail_content[1] = "#{mail_content.last} #{plural(time_difference, 'hour')}"

  		NotificationMailer.tour_history_mail(mail_content.first.humanize, mail_content.last.humanize).deliver
  	end

  	unless self.id_mismatch
  		mail_content = get_alert_message('id_mismatch')
  		NotificationMailer.tour_history_mail(mail_content.first.humanize, mail_content.last.humanize).deliver
  	end

  	if self.left
  		mail_content = get_alert_message('left')
  		mail_content[1] = "#{mail_content.last}, spending #{time_distance} on site."
  		NotificationMailer.tour_history_mail(mail_content.first.humanize, mail_content.last.humanize).deliver
  	end

  	if self.abandoned_tour_at_stop.present?
  		mail_content = get_alert_message('abandoned_tour_at_stop')
  		mail_content[1] = "#{mail_content.last} stop #{self.abandoned_tour_at_stop.to_s}"
  		NotificationMailer.tour_history_mail(mail_content.first.humanize, mail_content.last.humanize).deliver
  	end

  end

  def send_arrival_email
  	NotificationMailer.tour_history_mail("Visitor Has Arrived", "Tour has begun").deliver
  end

  
  def time_difference
  	((Time.zone.now - self.arrived) / 1.hour).round
  end

  def get_alert_message key
		message_data = AlertMessage.where(message_key: key).pluck(:message_key, :message_body).flatten  	
  end

  def plural count, str
  	ActionController::Base.helpers.pluralize(count, str)
  end

  def time_distance
  	ActionController::Base.helpers.distance_of_time_in_words self.arrived, self.left
  end


end
