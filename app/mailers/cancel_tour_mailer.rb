class CancelTourMailer < ApplicationMailer

  def cancel_tour_email scheduled_tour
    return unless (scheduled_tour.present? && scheduled_tour&.tour_user.present? && scheduled_tour&.community.present?)
    return unless NotificationValidatorService.new(scheduled_tour&.community&.email, scheduled_tour&.community&.id).validate_recipient
    
    @scheduled_tour = scheduled_tour
    @community = scheduled_tour.community
    @tour_user =  scheduled_tour&.tour_user
    @tour_type = get_tour_type(scheduled_tour)

    email_bcc = @community.email
    email_from = INFO_EMAIL

    if email_bcc.present? && email_from.present? && @tour_type.present?
      mail(to: email_bcc, from: email_from, subject: "A #{@tour_type} has been cancelled!")
    end
  end

  private

  def get_tour_type tour
    tour_type = tour.tour_type.split('_').map(&:capitalize).join(' ')

    property_tour_type = tour.property_tour_type == "scheduled_tour" ? tour_type : tour.property_tour_type.present? ? tour.property_tour_type.split('_').map(&:capitalize).join(' ') : tour_type 
    
    if property_tour_type == "Remote Tour" || tour_type == "Virtual tour"
      "Virtual Tour"
    elsif property_tour_type == "Unscheduled Self Tour"
      "Unscheduled App Guided Tour"
    elsif property_tour_type == "Self Tour"  || tour_type == "Self guided"
      "Scheduled App Guided Tour"
    else
      "Scheduled Person #{property_tour_type}"
    end

  end

end