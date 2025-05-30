class RentCafeApiV2Service
  def initialize(community_id)
    return unless community_id.present?

    begin
      @community = Community.find community_id
      @credentials = @community.credential
      
      return unless @credentials.present?
      return unless is_user_authorized?

    rescue
      return
    end
  end

  def get_apartment_availability property_code
    response = fetch_apartment_availability_data(property_code)
    response["apartmentAvailabilities"] rescue []
  end

  def get_apartment_pricing_matrix property_code
    response = fetch_apartment_pricing_data(property_code)
    response["pricingDetails"] rescue []
  end

  def get_floorplans property_code
    response = fetch_floorplans_data(property_code)
    response["floorplans"] rescue []
  end

  def is_user_authorized?
    begin
      token_expired? ? renew_token : true
    rescue
      false
    end
  end 

  private

    def token_expired?
      @credentials&.rentcafe_v2_auth_token.nil? || Time.now >= @credentials&.rentcafe_v2_token_expires_at
    end

    def renew_token
      response = get_token()
      return false unless response['access_token'].present?
      
      @credentials.update(
        rentcafe_v2_auth_token: response['access_token'], 
        rentcafe_v2_token_expires_at: (Time.now + response['expires_in'])
      )

      return true
    end

    def get_token
      url = "#{ENV["RENT_CAFE_V2_AUTH_BASE_URL"]}/connect/token"
      HTTParty.post(url,
        body: get_auth_params(),
        headers: { 'Content-Type' => 'application/x-www-form-urlencoded' }
      )
    end

    def fetch_apartment_availability_data property_code
      url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/apartmentavailability/getapartmentavailability"

      HTTParty.post(url,
        body: get_apartment_availability_params(property_code),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credentials&.rentcafe_v2_auth_token}",
          'vendor' => ENV['RENT_CAFE_V2_USERNAME']
        }
      )
    end

    def fetch_apartment_pricing_data property_code
      url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/UnitPricingData/getunitpricingdetails"

      HTTParty.post(url,
        body: get_unit_pricing_params(property_code),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credentials&.rentcafe_v2_auth_token}",
          'vendor' => ENV['RENT_CAFE_V2_USERNAME']
        }
      )
    end

    def fetch_floorplans_data property_code
      url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/floorplan/getfloorplans"

      HTTParty.post(url,
        body: get_floorplan_params(property_code),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credentials&.rentcafe_v2_auth_token}",
          'vendor' => ENV['RENT_CAFE_V2_USERNAME']
        }
      )
    end

    def get_auth_params
      {
        username: ENV['RENT_CAFE_V2_USERNAME'],
        password: ENV['RENT_CAFE_V2_PASSWORD'],
        client_id: ENV['RENT_CAFE_V2_CLIENT_ID'],
        grant_type: 'password'
      }
    end

    def get_apartment_availability_params property_code
      {
        apiToken: api_token, #required
        companyCode: company_code, #required
        propertyCode: property_code&.strip, #required
        showAllUnit: !@credentials.limit_result
      }.to_json
    end

    def get_unit_pricing_params property_code
      {
        apiToken: api_token, #required
        companyCode: company_code, #required
        propertyCode: property_code&.strip, #required
        showAllUnit:  !@credentials.limit_result
      }.to_json
    end

    def get_floorplan_params property_code
      {
        apiToken: api_token, #required
        companyCode: company_code, #required
        propertyCode: property_code&.strip, #required
      }.to_json
    end

    def api_token
      @credentials&.api_token&.strip
    end

    def company_code
      @credentials&.c_code&.strip
    end
end
