# == Schema Information
#
# Table name: schedual_tours
#
#  id                :integer          not null, primary key
#  tour_date         :date
#  tour_time         :time
#  tour_user_id      :integer
#  tour_id           :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  community_id      :integer
#  hourly_email_sent :boolean          default(FALSE)
#  daily_email_sent  :boolean          default(FALSE)
#  user_time_zone    :string
#  day_diff          :integer
#

class SchedualTour < ApplicationRecord
  has_paper_trail
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
  belongs_to :community, optional: true
end
