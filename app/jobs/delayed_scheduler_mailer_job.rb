class DelayedSchedulerMailerJob < ApplicationJob
  include SuckerPunch::Job

  def perform(subject, msg, to, community_subject = nil, community_msg = nil, community_to = nil, email_from = nil)
    if email_from.present?
      NotificationMailer.tour_history_mail(subject, msg, to, email_from).deliver_now
      NotificationMailer.tour_history_mail(community_subject, community_msg, community_to, email_from).deliver_now unless community_subject == nil
    else
      NotificationMailer.tour_history_mail(subject, msg, to).deliver_now
      NotificationMailer.tour_history_mail(community_subject, community_msg, community_to).deliver_now unless community_subject == nil
    end
  end
end