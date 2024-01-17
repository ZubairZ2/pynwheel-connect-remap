class ScheduledTourMailerJob < ApplicationJob
  include SuckerPunch::Job

  def perform(subject, msg, to, community, community_subject = nil, community_msg = nil, community_to = nil, email_from = nil, show_html, schedule_tour)
    return unless NotificationValidatorService.new(to, community&.id).validate_recipient
    return if (schedule_tour&.is_virtual_tour? || schedule_tour&.tour_user&.is_virtual_tour?)
    
    PynwheelMailer.scheduled_tour_mail(subject, msg, to, email_from, community, show_html, schedule_tour).deliver_now
  end

end