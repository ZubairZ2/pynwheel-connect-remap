class FunnelService < BaseService

  def initialize scheduled_tour

    if scheduled_tour.present?
      @scheduled_tour = scheduled_tour
      @tour_user = @scheduled_tour&.tour_user
      @community = @scheduled_tour&.community
      @crm_credentials = @community&.crm_credential
      @timezone = @community&.get_time_zone(DEFAULT_TIME_ZONE)
    end
  end

  def get_available_days
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/available-days/"
    
    response = HTTParty.get(url,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    response["available_days"]
  end

  def get_available_times day
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/available-times/?date=#{day}"
    
    response = HTTParty.get(url,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    response["available_times"]
  end

  def funnel_crm reschedule
    if is_funnel_crm && @scheduled_tour.property_tour_type.present?
      cancel_knock_appointment if reschedule && @scheduled_tour.property_tour_type === "scheduled_tour"
      create_knock_prospect unless @scheduled_tour.knock_prospect_id.present?
      create_knock_appointment if @scheduled_tour.property_tour_type === "scheduled_tour"
    end
  end

  def cancel_knock_appointment

  end

  private

  def is_funnel_crm
    @community.is_funnel_community?
  end

  def get_community_id
    @crm_credentials&.funnel_community_id
    # "1692"
  end

  def get_api_key
    @crm_credentials&.funnel_api_key
    # "22460cf71e4240cfa0e855cc28aa47dc"
  end

end