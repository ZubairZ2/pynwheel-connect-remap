# Moves a whole community to one status -- the sweep behind "Submit for
# Review", "Approve" and "Release" on the Launch dashboard.
#
# Which records that touches comes from PynwheelLaunch::Forms, so the sweep
# covers exactly the forms the client was shown and nothing else.
class Statuses
  def initialize community, current_user, status
    @community = community
    @current_user = current_user
    @status = status
  end

  def update_statuses
    return if @community.blank?

    PynwheelLaunch::Forms.applicable_for(@community).each do |form|
      PynwheelLaunch::Forms.records_for(@community, form).each do |record|
        @community.set_status_for_all(record, @status, @current_user)
      end
    end
  end
end
