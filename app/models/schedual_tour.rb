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

  before_destroy :cancel_knock_appointment
  before_destroy :notify_community_on_cancel_tour

  # validates :tour_date, presence: true
  # validates :tour_type, presence: true
  # validates :tour_time, presence: true

  scope :desc_tour_date, -> {order('coalesce(tour_date, created_at) desc')}
  scope :scheduled_tours, -> {where.not(tour_user_id: nil,tour_date: nil,tour_time: nil)}
  COUNTRY_CODES =  JSON.parse(File.read(Rails.root.join("app/assets/jsons/country_codes.json")))
  
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

  private 

  def cancel_knock_appointment
    return unless self.community.is_knock_community?
    KnockService.new(self).cancel_knock_appointment
  end

  def notify_community_on_cancel_tour
    return unless check_tour_status()
    CancelTourMailer.cancel_tour_email(self).deliver_now
  end

  def check_tour_status
    return unless self.community.present?

    time_zone = self.community.get_time_zone()
    tour_date = (self.tour_date || self.created_at.to_date).to_s
    tour_time = (self.tour_time || self.created_at).strftime("%I:%M%p")

    date_time = (tour_date + " " + tour_time).in_time_zone(time_zone)
    current_time = Time.now.in_time_zone(time_zone)

    is_tour_in_future(date_time, current_time)
  end

  def is_tour_in_future date_time, current_time
    if date_time > current_time
      if self.is_tour_completed
        false
      else
        true
      end
    else
      false
    end
  end

end
