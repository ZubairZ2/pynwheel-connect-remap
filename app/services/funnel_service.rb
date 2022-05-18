class FunnelService < BaseService

  def initialize 
    # @scheduled_tour = scheduled_tour
    # @tour_user = @scheduled_tour&.tour_user
    # @community = @scheduled_tour&.community
    # @crm_credentials = @community&.crm_credential
    # @timezone = @community&.get_time_zone(DEFAULT_TIME_ZONE)
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

  private

  def get_community_id
    # @community.crm_credential&.funnel_community_id
    "1692"
  end

  def get_api_key
    # @community.crm_credential&.funnel_api_key
    "22460cf71e4240cfa0e855cc28aa47dc"
  end

end