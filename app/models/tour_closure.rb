# frozen_string_literal: true

# A dated closure of a property's booking calendar (Settings › Visiting
# hours › Holidays & closures, October 20, 2026): the whole day, or the
# `start_time`–`end_time` window ("HH:MM", property-local) of that date. It
# applies to both tour-type lanes on top of the weekly opening hours and is
# read by Bookings::Availability only; the legacy pages never touch it.
class TourClosure < ApplicationRecord
  belongs_to :community

  scope :between, ->(from, to) { where(date: from..to).order(:date, :start_time) }

  def all_day?
    closed_all_day != false
  end
end
