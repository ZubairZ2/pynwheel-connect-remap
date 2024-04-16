class SchedualTour < ApplicationRecord
  has_paper_trail
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
  belongs_to :community, optional: true
  
  before_destroy :cancel_funnel_appointment, :cancel_yardi_tour, :cancel_knock_appointment, :notify_community_on_cancel_tour

  scope :desc_tour_date, -> {order('coalesce(tour_date, created_at) desc')}
  scope :scheduled_tours, -> { where.not(tour_user_id: nil, tour_date: nil, tour_time: nil, community_id: nil) }

  COUNTRIES =  JSON.parse(File.read(Rails.root.join("app/assets/jsons/country_codes.json")))
  
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

  def is_virtual_tour?
    self&.tour_type&.downcase&.include?("virtual") rescue false
  end

  def get_schedule_tour_url
    # return "" unless self&.community.present? && self&.tour_user.present?
    # return "" if ["salesforce", "PERQ"].include?(self.created_by)

    # if is_tour_completed || !future_tour?
    #   schedule_tour_of_user
    # elsif future_tour?
    #   reschedule_tour
    # else
    #   ""
    # end
    reschedule_tour
  end

  private

  def future_tour?
    community = self.community
    return true unless (self.tour_date && self.tour_time).present?

    timezone = community.get_time_zone()
    grace_period = community&.community_tour&.grace_period
    (self.tour_date.to_s + " " + self.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) + grace_period.minutes > Time.now.in_time_zone(timezone)
  end

  def schedule_tour_of_user
    "#{ENV['HOST_URL']}/scheduler_widget/test_widget?community_id=#{self&.community&.id}&community_code=#{self&.community&.community_code}&tour_user_id=#{self&.tour_user&.id}&schedule_tour_id=#{self.id}&schedule_tours_page=true&schedule_another_tour=true&direct=true"
  end

  def reschedule_tour
    "#{ENV['HOST_URL']}/scheduler_widget/test_widget?scheduled_tour_id=#{self.id}&community_id=#{self&.community&.id}&tour_user_id=#{self&.tour_user&.id}&reschedule_tour=true&direct=true&community_code=#{self&.community&.community_code}"
  end

  def cancel_funnel_appointment
    return unless self.community.is_funnel_community?
    FunnelService.new(self).cancel_funnel_appointment
  end

  def cancel_knock_appointment
    return unless self.community.is_knock_community?
    KnockService.new(self).cancel_knock_appointment
  end

  def cancel_yardi_tour
    return unless self.community.use_yardi_as_lead?
    if community&.credential&.rentcafe_api_version == "RentCafe V2"
      YardiRentCafeV2Services::MarketingApisV2Service.new(self).cancel_tour
    else
      YardiRentCafeServices::MarketingApisService.new(self).cancel_tour
    end
  end
  
  def notify_community_on_cancel_tour
    if is_unscheduled_tour() 
      CancelTourMailer.cancel_tour_email(self).deliver_now
    else
      if check_tour_status()
        CancelTourMailer.cancel_tour_email(self).deliver_now
      end
    end
  end

  def is_unscheduled_tour
    tour_type = self.tour_type.split('_').map(&:capitalize).join(' ')
    p_tour_type = self.property_tour_type == "scheduled_tour" ? tour_type : self.property_tour_type.present? ? self.property_tour_type.split('_').map(&:capitalize).join(' ') : tour_type 
    
    (p_tour_type == "Unscheduled Self Tour" || p_tour_type == "Remote Tour" || p_tour_type == "Virtual tour")
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
    return false unless date_time > current_time
    self.is_tour_completed
  end

end
