class SchedualTour < ApplicationRecord
  has_paper_trail
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
  belongs_to :community, optional: true
  
  before_destroy :cancel_yardi_tour, :cancel_knock_appointment, :notify_community_on_cancel_tour

  scope :desc_tour_date, -> {order('coalesce(tour_date, created_at) desc')}
  scope :scheduled_tours, -> { where.not(tour_user_id: nil, tour_date: nil, tour_time: nil, community_id: nil) }

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

  def cancel_yardi_tour
    return unless self.community.use_yardi_as_lead?
    YardiRentCafeServices::MarketingApisService.new(self).cancel_tour
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
