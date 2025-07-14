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

    get_filtered_discovery_sources(response)
  end

  def get_available_days
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/available-days/?tour_type=#{tour_type}"
    
    response = HTTParty.get(url,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    response["available_days"]
  end

  def get_available_times day
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/available-times/?date=#{day}&tour_type=#{tour_type}"
    
    response = HTTParty.get(url,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    response["available_times"]
  end

  def funnel_crm reschedule
    return unless (@scheduled_tour&.property_tour_type === "scheduled_tour" && is_funnel_crm)
    
    if reschedule
      # update_funnel_prospect
      cancel_funnel_appointment
    else
      create_funnel_prospect
    end

    create_funnel_appointment
  end

  def create_funnel_prospect
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/prospects/"
    payload = funnel_prospect_payload()
 
    response = HTTParty.post(url,
      body: payload.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )
    display_logs("Create Prospect", payload, response)
  end

  def update_funnel_prospect
    return unless @scheduled_tour&.funnel_prospect_id.present?

    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/prospects/#{@scheduled_tour.funnel_prospect_id.to_i}"
    payload = funnel_prospect_payload()
 
    response = HTTParty.put(url,
      body: payload.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Update Prospect", payload, response)
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

    display_logs("Statu of the appointment with ID #{@scheduled_tour&.funnel_appointment_id} updated to #{appointment_status}.", url, response)
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

  private

  def is_appointment_created response
    if ( response && response["prospect"] && response["appointment"] && response["prospect"]["id"] && response["appointment"]["id"] ).present?
      @scheduled_tour.update(funnel_prospect_id: response["prospect"]["id"], funnel_appointment_id: response["appointment"]["id"])
    end
  end

  def is_appointment_cancelled
    @scheduled_tour.update(funnel_prospect_id: nil, funnel_appointment_id: nil)
  end

  def get_filtered_discovery_sources response
    sources = parse_discovery_sources_response(response)
    ignored_sources = ignored_discovery_sources()
    sources&.map{|source| source unless ignored_sources.include?(source[0].downcase)}.compact.uniq
  end

  def ignored_discovery_sources
    [
      "Ads on Bing", "Ads on Google", "Bing Search", "Google Search", "Daily Hive", "Facebook", "Instagram", 
      "Manual", "Online Banner Ad", "RentCafe.com ILS", "Website Chat", "Website Direct"
    ].map{|source| source.downcase}
  end

  def parse_discovery_sources_response response
    if response["data"].present? && response["data"]["discovery_sources"].present?
      response["data"]["discovery_sources"].map{|source| [ source["name"], source["id"] ] }
    else
      []
    end
  end

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
        "discovery_source": @scheduled_tour.funnel_prospect_discover_source,
        "lead_source": @scheduled_tour.funnel_prospect_discover_source
      },
      "appointment": {
        "start": tour_start_time,
        "message": message,
        "tour_type": tour_type
      }
    }
  end

  def funnel_prospect_payload
    {
      "price_floor": "",
      "people": [ tour_user_data ],
      "price_ceiling": "",
      "agents": [],
      "parking": "",
      "doorman": "",
      "website_app_id": "",
      "group": "",
      "elevator": false,
      "broker_phone": "",
      "pets": [],
      "broker_last_name": "",
      "current_postal_code": "",
      "broker_first_name": "",
      "client_referral": "",
      "medium": "",
      "laundry": [],
      "discovery_source": @scheduled_tour.funnel_prospect_discover_source,
      "marketing_email_opt_in": false,
      "outdoor_space": [],
      "source_type": "",
      "broker_email": "",
      "device": "",
      "layout": [],
      "campaign_id": "",
      "campaign_info": "",
      "broker_company": "",
      "neighborhoods": [],
      "notes": "",
      "website_session_id": "",
      "lead_source": @scheduled_tour.funnel_prospect_discover_source,
      "website_user_id": "",
      "move_in_date": move_in_date.to_s,
      "third_party_vla_handling": false
    }
  end

  def message
    ""
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
    return "" unless @community.is_any_tour_type_selected
    tour_setting = @community&.community_tour.tour_setting

    if(tour_setting.allow_self_tour && tour_setting.allow_guided_tour)
      case @scheduled_tour.tour_type
      when "guided_tour"
        "guided"
      when "self_tour"
        "self-guided"
      end
    else
      if(tour_setting.allow_guided_tour)
        "self-guided"
      else
        "guided"
      end
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