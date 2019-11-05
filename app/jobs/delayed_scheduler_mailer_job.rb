class DelayedSchedulerMailerJob < ApplicationJob
  include SuckerPunch::Job

  def perform(subject, msg, to)
    NotificationMailer.tour_history_mail(subject, msg, to).deliver_now
  end
end