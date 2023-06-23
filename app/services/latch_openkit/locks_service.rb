module LatchOpenkit
  class LocksService < LatchOpenkit::BaseService

    def generate_doors_accesses
      @partner_scopped_token = parner_scopped_access_token()

      user_scopped_passwordless_start()
      @user_scopped_token = user_scopped_passwordless_token()

      invite_user()
    end

    private

      def parner_scopped_access_token
        response = HTTParty.post("#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token",
                                  body: parner_scopped_access_token_payload.to_json,
                                  headers: { 'Content-Type' => 'application/json' }
                                )
                                
        response["access_token"]
      end

      def user_scopped_passwordless_start
        HTTParty.post("#{ENV["Latch_OPENKIT_AUTH_URL"]}/passwordless/start",
                        body: user_scopped_passwordless_start_payload.to_json,
                        headers: { 'Content-Type' => 'application/json' }
                      )
      end

      def user_scopped_passwordless_token
        response = HTTParty.post("#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token",
                                  body: user_scopped_passwordless_token_payload.to_json,
                                  headers: { 'Content-Type' => 'application/json' }
                                )

        response["access_token"]
      end

      def invite_user
        HTTParty.post("#{ENV["Latch_OPENKIT_URL"]}/v1/users",
                        body: invite_user_payload.to_json,
                        headers: { 
                          'Content-Type' => 'application/json',
                          'Authorization' => "Bearer #{@partner_scopped_token}"
                        }                                  
                      )  
      end

      def invite_user_payload
        {
          "firstName": @tour_user&.first_name,
          "lastName":  @tour_user&.last_name,
          "email": @tour_user&.email,
          "startTime": @start_time&.to_i,
          "endTime": @end_time&.to_i,
          "doorUuids": @key_ids,
          "shareable": true,
          "passcodeType": "PERMANENT"
        }
      end

      def user_scopped_passwordless_token_payload
        {
          "audience": ENV["Latch_OPENKIT_URL"],
          "client_id": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_ID"],
          "client_secret": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET"],
          "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
          "realm": "email",
          "scope": "openid profile email offline_access",
          "username": @tour_user&.email,
          "otp": "563647" #Need to be handled dynamically
        }
      end

      def parner_scopped_access_token_payload
        {
          "audience": ENV["Latch_OPENKIT_URL"],
          "client_id": ENV["Latch_OPENKIT_M2M_CLIENT_ID"],
          "client_secret": ENV["Latch_OPENKIT_M2M_CLIENT_SECRET"],
          "grant_type": "client_credentials"
        }
      end

      def user_scopped_passwordless_start_payload
        {
          "client_id": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_ID"],
          "client_secret": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET"],
          "email": @tour_user&.email,
          "connection": "email",
          "send": "code"
        }
      end
  end
end