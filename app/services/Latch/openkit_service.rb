module Latch
  class OpenkitService < Latch::BaseService
    attr_reader :community_id, :start_time, :end_time, :key_ids
                :tour_user, :allow_key_card_count

    def initialize(community_id, start_time, end_time, key_ids, tour_user, allow_key_card_count)
      @latch = Latch.find_by(community_id: community_id)
      return unless @latch.present?

      @community_id = community_id
      @start_time = start_time
      @end_time = end_time
      @key_ids = key_ids
      @tour_user = tour_user
      @allow_key_card_count = allow_key_card_count

    end

    def generate_doors_accesses

    end

    private



    def parner_scopped_access_token
      response = HTTParty.post(openkit_auth_url,
                                body: parner_scopped_access_token_payload.to_json,
                                headers: { 'Content-Type' => 'application/json' }
                              )
    end

    def parner_scopped_access_token_payload
      {
        audience: openkit_url,
        client_id: openkit_m2m_client_id,
        client_secret: openkit_m2m_client_secret,
        grant_type: "client_credentials"
      }
    end



    def user_scopped_passwordless_start
      response = HTTParty.post(openkit_auth_url,
                                body: user_scopped_passwordless_start_payload.to_json,
                                headers: { 'Content-Type' => 'application/json' }
                              )
    end

    def user_scopped_passwordless_start_payload
      {
        client_id: openkit_passwordless_client_id,
        client_secret: openkit_passwordless_client_secret,
        email: param_user_email,
        connection: "email",
        send: "code"
      }
    end



    def user_scopped_passwordless_token
      response = HTTParty.post(openkit_auth_url,
                                body: user_scopped_passwordless_token_payload.to_json,
                                headers: { 'Content-Type' => 'application/json' }
                              )
    end

    def user_scopped_passwordless_token_payload
      {
        audience: openkit_url,
        client_id: openkit_passwordless_client_id,
        client_secret: openkit_passwordless_client_secret,
        grant_type: "http://auth0.com/oauth/grant-type/passwordless/otp",
        realm: "email",
        scope: "openid profile email offline_access",
        username: param_user_email,
        otp: "765651"
      }
    end

    def openkit_auth_url
      "#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token"
    end

    def openkit_url
      ENV["Latch_OPENKIT_URL"]
    end

    def openkit_m2m_client_id

    end

    def openkit_m2m_client_secret

    end

    def openkit_passwordless_client_id

    end

    def openkit_passwordless_client_secret

    end

    def param_first_name
      @tour_user.first_name
    end

    def param_last_name
      @tour_user.last_name
    end

    def param_email
      @tour_user.email
    end

    def param_start_time
      @start_time&.to_i
    end

    def param_end_time
      @end_time&.to_i
    end

    def param_door_uuid
      @key_ids
    end

    def openkit_user_refresh_token

    end


  end
end