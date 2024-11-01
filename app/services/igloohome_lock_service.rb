class IgloohomeLockService < BaseService
  include AllowedTourStopsHelper

  YEAR_EXPIRY = (Time.now + 1.year)
  DAILY_EXPIRY = (Time.now + 1.day)

  def initialize(community_id, current_time = Time.now, tour_user_id = nil)
    @community = Community.find_by_id community_id
    @igloohome_account = find_or_create_igloohome_account(community_id) if @community.present?
    @current_time = current_time
    @tour_user = TourUser.find_by_id tour_user_id

    return unless @igloohome_account.present?
    return unless is_user_authorized?
  end
 
  def client_credentials
    return unless @igloohome_account.present?
  
    HTTParty.post("#{auth_base_url}/oauth2/token",
      body: client_credentials_params,
      headers: client_auth_request_header
    )
  end

  def code_grant_authorization(code)
    return unless code.present?

    response = HTTParty.post("#{auth_base_url}/oauth2/token", 
                body: code_grant_authorization_params(code), 
                headers: auth_request_header 
              )
    store_tokens(response) if response.present?
  end

  def get_access_token_after_refresh
    return unless @igloohome_account.present?

    HTTParty.post("#{auth_base_url}/oauth2/token", 
      headers: auth_request_header, 
      body: get_access_token_after_refresh_params
    )
  end

  def get_properties
    HTTParty.get(
      "#{api_base_url}/properties", 
      :headers => api_request_header
    ) 
  end

  def get_property property_id
    HTTParty.get(
      "#{api_base_url}/properties/#{property_id}", 
      :headers => api_request_header
    ) 
  end

  def get_deivces
    HTTParty.get(
      "#{api_base_url}/devices", 
      :headers => api_request_header
    ) 
  end

  def get_property_devices property_id
    HTTParty.get(
      "#{api_base_url}/properties/#{property_id}/devices", 
      :headers => api_request_header
    ) 
  end

  def get_device device_id
    HTTParty.get(
      "#{api_base_url}/devices/#{device_id}", 
      :headers => api_request_header
    ) 
  end

  def generate_master_pin device_id
    HTTParty.get(
      "#{api_base_url}/devices/#{device_id}/masterpin", 
      :headers => pin_code_api_header
    ) 
  end

  def generate_one_time_pin device_id, access_name, start_time
    HTTParty.post(
      "#{api_base_url}/devices/#{device_id}/algopin/onetime", 
      :headers => pin_code_api_header, 
      :body => one_time_pin_params(access_name, start_time)
    )
  end

  def generate_permanent_pin device_id, access_name, start_time
    HTTParty.post(
      "#{api_base_url}/devices/#{device_id}/algopin/permanent", 
      :headers => pin_code_api_header,
      :body => permanent_pin_params(access_name, start_time)
    ) 
  end

  def generate_hourly_pin(device_id, access_name, start_time, end_time)
    HTTParty.post(
      "#{api_base_url}/devices/#{device_id}/algopin/hourly",
      headers: pin_code_api_header,
      body: hourly_pin_params(access_name, start_time, end_time).to_json
    )
  end

  def generate_daily_pin device_id, access_name, start_time, end_time
    HTTParty.post(
      "#{api_base_url}/devices/#{device_id}/algopin/daily", 
      :headers => pin_code_api_header,
      :body => daily_pin_params(access_name, start_time, end_time)
    ) 
  end

  def generate_accesses
    return unless @tour_user.present?

    allowed_stops = igloohome_allowed_stops(@community, @tour_user)
    igloohome_locks = IgloohomeLock.where(igloohome_id: @igloohome_account.id, stop_id: allowed_stops)
    assign_pin_codes(igloohome_locks) if igloohome_locks.present?
  end

  private

    def assign_pin_codes igloohome_locks
      IgloohomeGuest.where(community_id: @community.id, tour_user_id: @tour_user.id).delete_all
      igloohome_locks.each do |lock|
        if lock.device_id.present?
          pin_code = get_device_pin_code(lock)
          update_igloohome_guest_pin(pin_code, lock)
        end
      end
    end

    def update_igloohome_guest_pin guest_pin, lock
      IgloohomeGuest.create!(guest_pin: guest_pin, tour_user_id: @tour_user.id, community_id: @community.id, stop_id: lock.stop_id, stop_type: lock.stop_type)
    end

    def get_device_pin_code lock
      access = lock.stop_type.classify.constantize.find_by_id lock.stop_id
      access_name = access.name
      device_id = lock.device_id
      start_time = @current_time.strftime("%Y-%m-%dT%H:00:00%:z")
      end_time = (@current_time + 3.hours).strftime("%Y-%m-%dT%H:00:00%:z")

      response = generate_hourly_pin(device_id, access_name, start_time, end_time)
      response["pin"]
    end

    def find_or_create_igloohome_account community_id
      Igloohome.find_or_create_by(community_id: community_id) do |igloohome|
        igloohome.username = "Username"
        igloohome.password = "Password"
      end
    rescue StandardError => e
      Rails.logger.error("Error finding or creating Igloohome account: #{e.message}")
      nil
    end

    def is_user_authorized?
      @igloohome_account.access_token_expired? ? renew_access_token : true
    rescue
      false
    end

    def renew_access_token
      response = if @igloohome_account.is_client_auth
                    client_credentials
                elsif @igloohome_account.is_auth_code && !@igloohome_account.refresh_token_expired?
                    get_access_token_after_refresh
                end
      store_access_token(response["access_token"]) if response&.dig("access_token").present?
    end

    def store_access_token access_token
      return unless access_token.present?
      @igloohome_account.update_columns(
        access_token: access_token, 
        access_token_expiry: DAILY_EXPIRY, 
        is_authorized_with_pynwheel: true
      )
    end

    def store_tokens response
      if response&.dig("access_token").present? && response&.dig("refresh_token").present?
        @igloohome_account.update_columns(
          access_token: response&.dig("access_token"), access_token_expiry: DAILY_EXPIRY,
          refresh_token: response&.dig("refresh_token"), refresh_token_expiry: YEAR_EXPIRY,
          is_authorized_with_pynwheel: true
        )
      end
    end

    def one_time_pin_params access_name, start_time
      {
        'variance' => 1,
        'startDate' => start_time,
        'accessName' => access_name
      }
    end

    def permanent_pin_params access_name, start_time
      {
        'variance' => 1,
        'startDate' => start_time,
        'accessName' => access_name
      }
    end

    def hourly_pin_params access_name, start_time, end_time
      {
        'variance' => 1,
        'startDate' => start_time,
        'endDate' => end_time,
        'accessName' => access_name
      }
    end

    def daily_pin_params access_name, start_time, end_time
      {
        'variance' => 1,
        'startDate' => start_time,
        'endDate' => end_time,
        'accessName' => access_name
      }
    end

    def get_access_token_after_refresh_params
      {
        'client_id' => client_id_through_pynwheel,
        'grant_type' => 'refresh_token',
        'refresh_token' => @igloohome_account.refresh_token
      }
    end

    def code_grant_authorization_params auth_code
      {
        'code' => auth_code,
        'client_id' => client_id_through_pynwheel,
        'grant_type' => 'authorization_code',
        'redirect_uri' => redirect_uri
      }
    end

    def client_credentials_params
      { 'grant_type' => 'client_credentials' }
    end

    def auth_request_header
      {
        'Authorization' => "Basic #{encode_pynwheel_credentials}",
        'Content-Type' => 'application/x-www-form-urlencoded',
      }
    end

    def client_auth_request_header
      { 
        'Authorization' => "Basic #{encode_client_credentials}",
        'Content-Type' => 'application/x-www-form-urlencoded' 
      }
    end

    def api_request_header
      { 'Authorization' => "Bearer #{@igloohome_account.access_token}" }
    end

    def pin_code_api_header
      { 
        'Authorization' => "Bearer #{@igloohome_account.access_token}",
        'Content-Type' => 'application/json'
      }
    end

    def encode_pynwheel_credentials
      Base64.strict_encode64("#{client_id_through_pynwheel}:#{secret_id_through_pynwheel}")
    end

    def encode_client_credentials
      Base64.strict_encode64("#{client_id_associated_with_client}:#{secret_id_associated_with_client}")
    end

    def client_id_through_pynwheel
      ENV["PYNWHEEL_IGLOOHOME_CLIENT_ID"]
    end

    def secret_id_through_pynwheel
      ENV["PYNWHEEL_IGLOOHOME_CLIENT_SECRET"]
    end

    def client_id_associated_with_client
      @igloohome_account.client_id
    end

    def secret_id_associated_with_client
      @igloohome_account.client_secret
    end

    def api_base_url
      ENV["IGLOOHOME_API_V2_BASE_URL"]
    end

    def auth_base_url
      ENV["IGLOOHOME_AUTH_BASE_URL"]
    end

    def redirect_uri
      ENV["IGLOOHOME_REDIRECT_URI"]
    end
end