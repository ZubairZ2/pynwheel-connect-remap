class RentCafeApiV2Service
  def initialize(community_id)
    return unless community_id.present?

    begin
      @community = Community.find community_id
      @credential = @community.credential

      return unless @credential.present?
    rescue
      return
    end
  end

  def get_appartment_availability property_code
    return unless is_user_authorized?
    fetch_appartment_availability(property_code)
  end

  private

    def is_user_authorized?
      begin
        token_expired? ? renew_token : true
      rescue
        false
      end
    end

    def token_expired?
      @credential&.rentcafe_v2_auth_token.nil? || Time.now >= @credential&.rentcafe_v2_token_expires_at
    end

    def renew_token
      response = get_token()
      return false unless response['access_token'].present?
      
      @credential.update(
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

    def fetch_appartment_availability property_code
      url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/apartmentavailability/getapartmentavailability"

      HTTParty.post(url,
        body: get_appartment_availability_params(property_code),
        headers: { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
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

    def get_appartment_availability_params property_code
      {
        apiToken: api_token, #must required
        companyCode: company_code, #must required
        propertyCode: property_code, #must required
        propertyId: property_id, #option but if you add it in params it must belong to company. On invalid propertyId will generate occur error
        showAllUnit: true
      }.to_json
    end

    def api_token
      @credential&.api_token
    end

    def company_code
      @credential&.c_code
    end

    def property_id
      977826
    end
end
