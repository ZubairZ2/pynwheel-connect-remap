module YardiRentCafeV2Services
  class MarketingApisV2Service < YardiRentCafeV2Services::BaseService
    def available_slots
      fetch_available_slots&.dig("availableSlots") || []
    end

    def schedule_tour(previous_tour = nil)
      cancel_tour(previous_tour)
      response = create_appointment

      create_access_log(create_appointment_body_params&.to_json, response)

      if response.present? && response&.parsed_response&.dig("prospectInfo").present?
        yardi_response = response&.dig("prospectInfo") 
        yardi_scheduled_tour_response(yardi_response) if yardi_response.present?
      end
    end

    def cancel_tour(previous_tour = nil)
      return unless valid_for_cancellation?

      response = cancel_appointment(previous_tour)
      create_access_log(cancel_appointment_body_params(previous_tour)&.to_json, response)

      update_yardi_scheduled_tour if response&.dig("errorCode") == 200
    end

    private

    def valid_for_cancellation?
      @community.use_yardi_as_lead? &&
        @scheduled_tour.yardirentcafe_prospect_id.present? &&
        @scheduled_tour.yardirentcafe_appointment_id.present?
    end

    def api_headers
      {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{@credentials&.rentcafe_v2_auth_token}",
        'vendor' => ENV['RENT_CAFE_V2_USERNAME']
      }
    end

    def post_request(url, body)
      HTTParty.post(url, body: body, headers: api_headers)
    end

    def fetch_available_slots
      post_request("#{base_url}/appointments/getavailableslots", available_slots_body_params.to_json)
    end

    def create_appointment
      post_request("#{base_url}/appointments/createappointment", create_appointment_body_params.to_json)
    end

    def cancel_appointment(previous_tour)
      post_request("#{base_url}/appointments/cancelappointment", cancel_appointment_body_params(previous_tour).to_json)
    end

    def base_url
      ENV["RENT_CAFE_V2_MARKETING_API_BASE_URL"]
    end

    def available_slots_body_params
      {
        apiToken: api_token,
        companyCode: company_code,
        propertyCode: property_code
      }
    end

    def create_appointment_body_params
      {
        apiToken: api_token,
        companyCode: company_code,
        propertyCode: property_code,
        firstName: prospect_first_name,
        lastName: prospect_last_name,
        email: prospect_email,
        phone: prospect_phone,
        apptDate: get_scheduled_tour_date,
        apptTime: get_scheduled_tour_time,
        message: "Appointment created through Pynwheel",
        source: source,
        desiredMoveinDate: prospect_move_in_date,
        desiredBedrooms: prospect_desired_bedroorms || 1,
        tourType: get_scheduled_tour_type
      }
    end

    def cancel_appointment_body_params(previous_tour)
      {
        apiToken: api_token,
        companyCode: company_code,
        propertyCode: property_code,
        voyProspectId: prospect_id,
        voyApptId: appointment_id,
        apptDate: get_scheduled_tour_cancel_date(previous_tour),
        apptTime: get_scheduled_tour_cancel_time(previous_tour)
      }
    end

    def yardi_scheduled_tour_response(yardi_scheduled_tour)
      update_yardi_scheduled_tour(
        yardi_scheduled_tour["voyProspectId"],
        yardi_scheduled_tour["voyProspectApptId"]
      )
    end

    def update_yardi_scheduled_tour(yardirentcafe_prospect_id = nil, yardirentcafe_appointment_id = nil)
      @scheduled_tour.update(
        yardirentcafe_prospect_id: yardirentcafe_prospect_id,
        yardirentcafe_appointment_id: yardirentcafe_appointment_id
      )
    end
  end
end