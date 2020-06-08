class DelayedSchedulerMailerJob < ApplicationJob
  include SuckerPunch::Job

  def perform(subject, msg, to, community_subject, community_msg, community_to)
    NotificationMailer.tour_history_mail(subject, msg, to).deliver_now
    NotificationMailer.tour_history_mail(community_subject, community_msg, community_to).deliver_now
  end
end