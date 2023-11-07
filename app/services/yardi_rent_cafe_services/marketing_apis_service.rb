module YardiRentCafeServices
  class MarketingApisService < YardiRentCafeServices::BaseService

    def available_slots
      response = fetch_available_slots()
      (response&.dig("errorCode") == 200) ? response["availableSlots"] : []
    end

    def schedule_tour previous_tour = nil
      cancel_tour(previous_tour)
      response = create_appointment()
      response = (response&.dig("errorCode") == 200) ? response["prospectInfo"] : nil
      yardi_scheduled_tour_response(response) if response.present?
    end

    def cancel_tour previous_tour = nil
      return unless @community.use_yardi_as_lead? && @scheduled_tour.yardirentcafe_prospect_id.present? && @scheduled_tour.yardirentcafe_appointment_id.present?
      response = cancel_appointment(previous_tour)
      update_yardi_scheduled_tour if (response&.dig("errorCode") == 200)
    end

    private

    def fetch_available_slots
      url = "#{ENV["RENT_CAFE_V2_MARKETING_API_BASE_URL"]}/appointments/getavailableslots"

      HTTParty.post(url,
        body: available_slots_body_params(),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
          'vendor' => ENV['RENT_CAFE_V2_USERNAME']
        }
      )
    end

    def create_appointment
      url = "#{ENV["RENT_CAFE_V2_MARKETING_API_BASE_URL"]}/appointments/createappointment"

      HTTParty.post(url,
        body: create_appointment_body_params(),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
          'vendor' => ENV['RENT_CAFE_V2_USERNAME']
        }
      )
    end

    def cancel_appointment previous_tour
      url = "#{ENV["RENT_CAFE_V2_MARKETING_API_BASE_URL"]}/appointments/cancelappointment"

      HTTParty.post(url,
        body: cancel_appointment_body_params(previous_tour),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
          'vendor' => ENV['RENT_CAFE_V2_USERNAME']
        }
      )
    end

    def available_slots_body_params
      {
        apiToken: api_token,
        companyCode: company_code,
        propertyCode: property_code
      }.to_json
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
        message: "Appointment created through pynwheel",
        source: source,
        desiredMoveinDate: prospect_move_in_date,
        desiredBedrooms: prospect_desired_bedroorms || 1,
        tourType: get_scheduled_tour_type
      }.to_json
    end

    def cancel_appointment_body_params previous_tour
      {
        apiToken: api_token,
        companyCode: company_code,
        propertyCode: property_code,
        voyProspectId: prospect_id,
        voyApptId: appointment_id,
        apptDate: get_scheduled_tour_cancel_date(previous_tour),
        apptTime: get_scheduled_tour_cancel_time(previous_tour)
      }.to_json
    end

    def yardi_scheduled_tour_response yardi_scheduled_tour
      yardirentcafe_prospect_id = yardi_scheduled_tour["voyProspectId"] rescue nil
      yardirentcafe_appointment_id = yardi_scheduled_tour["voyProspectApptId"] rescue nil
      update_yardi_scheduled_tour(yardirentcafe_prospect_id, yardirentcafe_appointment_id)
    end

    def update_yardi_scheduled_tour yardirentcafe_prospect_id = nil, yardirentcafe_appointment_id = nil
      @scheduled_tour.update(yardirentcafe_prospect_id: yardirentcafe_prospect_id, yardirentcafe_appointment_id: yardirentcafe_appointment_id)
    end
  end
end