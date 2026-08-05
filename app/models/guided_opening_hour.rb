class GuidedOpeningHour < ApplicationRecord
  include RailsSortable::Model
  belongs_to :community
  include LaunchStatusable

  set_sortable :sort

  def as_json options = {}
    super(
      :only => [:day]
    ).merge!({
       :id => self.id,
      opening_time: change_time(self.opening_time),
      closing_time: change_time(self.closing_time)
    })
  end

  def change_time(opening)
    Time.strptime(opening, "%H:%M").strftime("%I:%M %p")
  end

  # Launch: a guided visiting hour is complete once the day and both times are set.
  def derive_launch_status
    launch_status_from(day.present? && opening_time.present? && closing_time.present?)
  end
end
