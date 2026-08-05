# The community's onboarding form list as Launch renders it.
#
# What backs each form, which forms a community needs and how their records
# roll up all live in PynwheelLaunch::Forms -- this class is just the view of
# that for one community.
class PynwheelLaunch::Communities::CommunityDetailForms
  def initialize(community)
    @community = community
  end

  # The statuses behind one form, as the community page shows them: one entry
  # per distinct status among the form's records.
  def check_status_of_specific_form(form_type)
    PynwheelLaunch::Forms.statuses_for(@community, form_type)
  end

  # Every form this community has to fill in, with its statuses.
  def get_community_detail_forms(products = nil)
    PynwheelLaunch::Forms.applicable_for(@community, products).map do |form|
      { name: form, status: PynwheelLaunch::Forms.statuses_for(@community, form) }
    end
  end

  # Applies a reviewer's decision to every record behind the form.
  def update_status_and_remarks(detail_type, status, remarks)
    PynwheelLaunch::Forms.apply_status(@community, detail_type, status, remarks)
  end

  def update_pynwheel_connect_fields params
    return unless @community.community_tour.present?
    @community.community_tour.update(max_self_tour_users: params["tour"]["max_tours"].to_i)
    @community.update(one_hour_email_text: params["tour"]["start_tour"])
  end
end
