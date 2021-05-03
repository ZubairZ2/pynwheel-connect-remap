class DelayedSchedulerMailerJob < ApplicationJob
  include SuckerPunch::Job

  def perform(subject, msg, to,community, community_subject = nil, community_msg = nil, community_to = nil, email_from = nil,show_html)
    if email_from.present?
      NotificationMailer.tour_history_mail(subject, msg, to, email_from,community,show_html).deliver_now
      if community_subject.present?
        NotificationMailer.tour_history_mail(community_subject, community_msg, community_to, email_from,community,show_html).deliver_now unless community_subject == nil
      end
    else
      NotificationMailer.tour_history_mail(subject, msg, to,community,show_html).deliver_now
      NotificationMailer.tour_history_mail(community_subject, community_msg, community_to,community,show_html).deliver_now unless community_subject == nil
    end
  end
end