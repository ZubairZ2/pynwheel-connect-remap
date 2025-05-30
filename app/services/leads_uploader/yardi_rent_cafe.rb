module LeadsUploader
  class YardiRentCafe < LeadsUploader::BaseService

    def leads_uploader
      upload_leads()
    end

    private

      def upload_leads
        url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/lead/createlead"

        HTTParty.post(url,
          body: lead_body_params(),
          headers: { 
            'Content-Type' => 'application/json',
            'Authorization' => "Bearer #{@credentials&.rentcafe_v2_auth_token}",
            'vendor' => ENV['RENT_CAFE_V2_USERNAME']
          }
        )
      end

      def lead_body_params
        {
          apiToken: api_token,
          companyCode: company_code,
          propertyCode: property_code,
          firstName: first_name,
          lastName: last_name,
          email: email,
          phone: phone,
          message: message,
          source: source,
          secondarySource: secondary_source,
          addr1: address_1,
          addr2: address_2,
          state: state,
          city: city,
          zipCode: zip_code
        }.to_json
      end
  end
end