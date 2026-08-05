# Decides which follow-up email a community has earned, from how far along its
# onboarding forms are.
#
# The form list and the roll-up come from PynwheelLaunch::Forms, so these
# emails describe the same state the client sees in Launch.
class PynwheelLaunch::Communities::FollowUpEmails
  def initialize(community)
    @community = community
  end

  def move_to_production_auto_email
    forms = forms_list
    return false if forms.blank?

    forms.all? { |form| [APPROVED, RELEASED, APPLICATION_IN_REVIEW].include?(form[:status]) }
  end

  def send_emails
    forms = forms_list
    return if forms.blank?

    readable_forms_status = get_readable_form_status(forms)

    if forms.all? { |form| not_started?(form) }
      { type: APPLICATION_NOT_STARTED, data: readable_forms_status }
    elsif forms.any? { |form| not_started?(form) }
      { type: APPLICATION_IN_PROGRESS, data: readable_forms_status }
    else
      { data: readable_forms_status }
    end
  end

  def non_production_communities_email
    forms = forms_list
    return if forms.blank?

    return {} unless forms.any? { |form| not_started?(form) }

    { type: APPLICATION_NOT_STARTED, data: get_readable_form_status(forms) }
  end

  private

  def not_started?(form)
    form[:status].eql?(IN_PROGRESS) || form[:status].nil?
  end

  def forms_list
    PynwheelLaunch::Forms.core_for(@community).map do |form|
      { name: form, status: PynwheelLaunch::Forms.rolled_up_status(@community, form) }
    end
  end

  def get_readable_form_status(forms)
    forms.map { |form| { name: form[:name], status: modify_status_readable(form[:status]) } }
  end

  def modify_status_readable(status)
    case status
    when SUBMITTED then "Submitted"
    when APPROVED, FORM_APPROVED, APPLICATION_IN_REVIEW then "Approved"
    when IN_PROGRESS then "In Progress..."
    when RELEASED then "Application Released"
    when REJECTED then "Attention Required"
    when DEPLOYED then "Deployed"
    else "Not Provided"
    end
  end
end
