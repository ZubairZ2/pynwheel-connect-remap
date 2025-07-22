class FunnelService < BaseService

  def initialize(community)
    @community = community
    @crm_credentials = @community&.crm_credential
    @timezone = @community&.get_time_zone(DEFAULT_TIME_ZONE)
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

  def available_slots
    begin
      result = {}

      %w[guided self-guided].each do |tour_type|
        day_map = {}

        available_days = get_available_days(tour_type)
        available_days.each do |day|
          times = get_available_times(day, tour_type)
          next unless times.present?

          formatted_times = times.map { |t| Time.parse(t).strftime("%H:%M") }
          day_map[day] = formatted_times
        end

        result[tour_type] = day_map
      end

      result
    rescue => e
      raise e
    end
  end

  def get_available_days(tour_type)
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/available-days/?tour_type=#{tour_type}"

    response = HTTParty.get(url,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    response["available_days"]
  end

  def get_available_times(day, tour_type)
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/available-times/?date=#{day}&tour_type=#{tour_type}"

    response = HTTParty.get(url,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    response["available_times"]
  end

  def funnel_crm(scheduled_tour, reschedule)
    return unless scheduled_tour&.property_tour_type == "scheduled_tour" && is_funnel_crm

    if reschedule
      cancel_funnel_appointment(scheduled_tour)
    else
      create_funnel_prospect(scheduled_tour)
    end

    create_funnel_appointment(scheduled_tour)
  end

  def create_funnel_prospect(scheduled_tour)
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/prospects/"
    payload = funnel_prospect_payload(scheduled_tour)

    response = HTTParty.post(url,
      body: payload.to_json,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Create Prospect", payload, response)
  end

  def update_funnel_prospect(scheduled_tour)
    return unless scheduled_tour&.funnel_prospect_id.present?

    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/prospects/#{scheduled_tour.funnel_prospect_id.to_i}"
    payload = funnel_prospect_payload(scheduled_tour)

    response = HTTParty.put(url,
      body: payload.to_json,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Update Prospect", payload, response)
  end

  def create_funnel_appointment(scheduled_tour)
    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/"
    payload = funnel_appointment_payload(scheduled_tour)

    response = HTTParty.post(url,
      body: payload.to_json,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Create appointment", payload, response)
    is_appointment_created(response, scheduled_tour)
  end

  def update_appointment_status(scheduled_tour, appointment_status)
    return unless scheduled_tour&.funnel_appointment_id.present?

    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/#{scheduled_tour.funnel_appointment_id}/"

    response = HTTParty.put(url,
      body: { status: appointment_status }.to_json,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Status of the appointment with ID #{scheduled_tour.funnel_appointment_id} updated to #{appointment_status}.", url, response)
  end

  def cancel_funnel_appointment(scheduled_tour)
    return unless scheduled_tour&.funnel_appointment_id.present?

    url = "#{ENV["FUNNEL_BASE_URL"]}/api/partners/v1/community/#{get_community_id}/appointments/#{scheduled_tour.funnel_appointment_id}/"

    response = HTTParty.delete(url,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{get_api_key}"
      }
    )

    display_logs("Cancel appointment", url, response)
    is_appointment_cancelled(scheduled_tour)
  end

  private

  def is_appointment_created(response, scheduled_tour)
    if response&.dig("prospect", "id").present? && response&.dig("appointment", "id").present?
      scheduled_tour.update(
        funnel_prospect_id: response["prospect"]["id"],
        funnel_appointment_id: response["appointment"]["id"]
      )
    end
  end

  def is_appointment_cancelled(scheduled_tour)
    scheduled_tour.update(funnel_prospect_id: nil, funnel_appointment_id: nil)
  end

  def get_filtered_discovery_sources(response)
    sources = parse_discovery_sources_response(response)
    ignored_sources = ignored_discovery_sources
    sources&.map { |source| source unless ignored_sources.include?(source[0].downcase) }.compact.uniq
  end

  def ignored_discovery_sources
    [
      "Ads on Bing", "Ads on Google", "Bing Search", "Google Search", "Daily Hive", "Facebook", "Instagram",
      "Manual", "Online Banner Ad", "RentCafe.com ILS", "Website Chat", "Website Direct"
    ].map(&:downcase)
  end

  def parse_discovery_sources_response(response)
    if response["data"].present? && response["data"]["discovery_sources"].present?
      response["data"]["discovery_sources"].map { |source| [source["name"], source["id"]] }
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

  def funnel_appointment_payload(scheduled_tour)
    {
      "prospect": {
        "people": [tour_user_data(scheduled_tour)],
        "move_in_date": move_in_date(scheduled_tour),
        "discovery_source": scheduled_tour.funnel_prospect_discover_source,
        "lead_source": scheduled_tour.funnel_prospect_discover_source
      },
      "appointment": {
        "start": tour_start_time(scheduled_tour),
        "message": message,
        "tour_type": scheduled_tour_type(scheduled_tour)
      }
    }
  end

  def funnel_prospect_payload(scheduled_tour)
    {
      "price_floor": "",
      "people": [tour_user_data(scheduled_tour)],
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
      "discovery_source": scheduled_tour.funnel_prospect_discover_source,
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
      "lead_source": scheduled_tour.funnel_prospect_discover_source,
      "website_user_id": "",
      "move_in_date": move_in_date(scheduled_tour).to_s,
      "third_party_vla_handling": false
    }
  end

  def message
    ""
  end

  def tour_start_time(scheduled_tour)
    tour_datetime = if scheduled_tour.tour_date.present? && scheduled_tour.tour_time.present?
                      (scheduled_tour.tour_date.to_s + " " + scheduled_tour.tour_time.strftime("%I:%M%p")).in_time_zone(@timezone)
                    end

    tour_datetime&.strftime("%FT%T%:z").to_s || Time.now.in_time_zone(@timezone).strftime("%FT%T%:z").to_s
  end

  def move_in_date(scheduled_tour)
    scheduled_tour&.desired_move_in_date || ""
  end

  def scheduled_tour_type(scheduled_tour)
    case scheduled_tour.tour_type
    when "guided_tour"
      "guided"
    when "self_tour"
      "self-guided"
    end
  end

  def tour_user_data(scheduled_tour)
    user = scheduled_tour&.tour_user
    return {} unless user

    {
      "first_name": user.first_name,
      "last_name": user.last_name,
      "is_primary": true,
      "phone_2": user.phone_number,
      "email": user.email,
      "phone_1": user.phone_number
    }
  end

  def display_logs(msg, payload, resp)
    AccessLogsService.new.funnel_logs(@community.id, msg, payload, resp)
  end
end
