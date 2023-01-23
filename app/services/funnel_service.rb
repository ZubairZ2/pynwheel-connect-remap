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

  def get_discovery_sources
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/discovery-sources/"

    response = HTTParty.get(url,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    if response["data"].present? && response["data"]["discovery_sources"].present?
      response["data"]["discovery_sources"].map{|source| source["name"]}
    else
      []
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
      cancel_funnel_appointment if reschedule && @scheduled_tour.property_tour_type === "scheduled_tour"
      create_funnel_appointment if @scheduled_tour.property_tour_type === "scheduled_tour"
    end
  end

  def create_funnel_appointment
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/"
    payload = funnel_appointment_payload()

    response = HTTParty.post(url,
      body: payload.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Create appointment", payload, response)
    is_appointment_created(response)
  end

  def update_appointment_status appointment_status
    return unless @scheduled_tour&.funnel_appointment_id.present?

    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/#{@scheduled_tour.funnel_appointment_id}/"

    response = HTTParty.put(url,
      body: { status: appointment_status }.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Appointment status updated", url, response)
  end

  def cancel_funnel_appointment
    return unless @scheduled_tour&.funnel_appointment_id.present?

    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/#{@scheduled_tour.funnel_appointment_id}/"

    response = HTTParty.delete(url,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Cancel appointment", url, response)
    is_appointment_cancelled()
  end

  def is_appointment_created response
    if ( response && response["prospect"] && response["appointment"] && response["prospect"]["id"] && response["appointment"]["id"] ).present?
      @scheduled_tour.update_attributes(funnel_prospect_id: response["prospect"]["id"], funnel_appointment_id: response["appointment"]["id"])
    end
  end

  def is_appointment_cancelled
    @scheduled_tour.update_attributes(funnel_prospect_id: nil, funnel_appointment_id: nil)
  end

  private

  def is_funnel_crm
    @community.is_funnel_community?
  end

  def get_community_id
    @crm_credentials&.funnel_community_id
  end

  def get_api_key
    @crm_credentials&.funnel_api_key
  end

  def funnel_appointment_payload
    {
      "prospect": {
        "people": [ tour_user_data ],
        "move_in_date": move_in_date,
        "discovery_source": @scheduled_tour.funnel_prospect_discover_source
      },
      "appointment": {
        "start": tour_start_time,
        "message": message,
        "tour_type": tour_type
      }
    }
  end

  def message
    "Looking forward to my appointment"
  end

  def tour_start_time
    tour_datetime = (@scheduled_tour.tour_date.to_s + " " + @scheduled_tour.tour_time.strftime("%I:%M%p")).in_time_zone(@timezone) if @scheduled_tour.tour_date.present? && @scheduled_tour.tour_time.present?
    tour_datetime = tour_datetime.strftime("%FT%T%:z").to_s if tour_datetime.present?
    tour_datetime || Time.now.in_time_zone(@timezone).strftime("%FT%T%:z").to_s
  end

  def move_in_date
    @scheduled_tour&.desired_move_in_date || ""
  end

  def tour_type
    case @scheduled_tour.tour_type
    when "guided_tour"
      "guided"
    when "self_tour"
      "self-guided"
    end  
  end

  def tour_user_data
    {
      "first_name": @tour_user.first_name,
      "last_name": @tour_user.last_name,
      "is_primary": true,
      "phone_2": @tour_user.phone_number,
      "email": @tour_user.email,
      "phone_1": @tour_user.phone_number
    }
  end

  def display_logs msg, payload, resp
    AccessLogsService.new().funnel_logs(@community.id, msg, payload, resp)
  end

end