module YardiRentCafeV2Services
  class LeadsApiV2Service < YardiRentCafeV2Services::BaseService

    def upload_leads_data visited_stops, tour_history, is_tour_abandoned
      upload_leads(visited_stops, tour_history, is_tour_abandoned)
    end

    private

      def upload_leads visited_stops, tour_history, is_tour_abandoned
        url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/lead/createlead"

        HTTParty.post(url,
          body: lead_body_params(visited_stops, tour_history, is_tour_abandoned),
          headers: { 
            'Content-Type' => 'application/json',
            'Authorization' => "Bearer #{@credentials&.rentcafe_v2_auth_token}",
            'vendor' => ENV['RENT_CAFE_V2_USERNAME']
          }
        )
      end

      def lead_body_params visited_stops, tour_history, is_tour_abandoned
        {
          apiToken: api_token,
          companyCode: company_code,
          propertyCode: property_code,
          firstName: prospect_first_name,
          lastName: prospect_last_name,
          email: prospect_email,
          phone: prospect_phone,
          message: get_message(visited_stops, tour_history, is_tour_abandoned),
          source: source,
          addr1: address_1,
          state: state,
          city: city,
          zipCode: zip_code,
          desiredMoveinDate: prospect_move_in_date,
          desiredBedrooms: prospect_desired_bedroorms || 1
        }.to_json
      end
  end
end