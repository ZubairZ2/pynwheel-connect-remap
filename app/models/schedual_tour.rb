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

  validates :tour_date, presence: true
  validates :tour_type, presence: true
  validates :tour_time, presence: true

  scope :desc_created_at, -> {order(created_at: :desc)}

  def add_user_in_zerv
    if self.tour_user_id.present? and community.enable_locks and community.multiple_locks_provider.include?("Zerv")
      Thread.new do
        execution_context = Rails.application.executor.run!
        ZervServices::GrantAccessesService.call(community: community, tour_user: tour_user, stop_list: nil, is_resident: false)
      ensure
        execution_context.complete! if execution_context
      end
    end
  end
end
