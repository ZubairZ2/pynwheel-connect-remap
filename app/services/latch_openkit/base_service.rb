module LatchOpenkit
  class BaseService
    # attr_reader :community_id, :start_time, :end_time, :key_ids
    #         :tour_user, :allow_key_card_count

    # def initialize(community_id, start_time, end_time, key_ids, tour_user, allow_key_card_count)
    def initialize()
      # @latch = Latch.find_by(community_id: community_id)
      # return unless @latch.present?

      # @community_id = community_id
      # @start_time = start_time
      # @end_time = end_time
      # @key_ids = key_ids
      # @tour_user = tour_user
      # @allow_key_card_count = allow_key_card_count

      binding.pry
      @community_id = 229
      @start_time = Time.now.to_i
      @end_time = (Time.now + 90.minutes).to_i
      @key_ids = ["85b84d5a-5cf1-498c-997b-932584eb75fd"]
      @tour_user = TourUser.find 10407
      @allow_key_card_count = 0
      binding.pry

    end

    private
      def user_scopped_passwordless_token_payload
        {
          "audience": openkit_url,
          "client_id": openkit_passwordless_client_id,
          "client_secret": openkit_passwordless_client_secret,
          "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
          "realm": "email",
          "scope": "openid profile email offline_access",
          "username": param_user_email,
          "otp": "765651"
        }
      end

      def parner_scopped_access_token_payload
        {
          "audience": openkit_url,
          "client_id": openkit_m2m_client_id,
          "client_secret": openkit_m2m_client_secret
          # "grant_type": "client_credentials"
        }
      end

      def user_scopped_passwordless_start_payload
        {
          "client_id": openkit_passwordless_client_id,
          "client_secret": openkit_passwordless_client_secret,
          "email": param_user_email,
          "connection": "email",
          "send": "code"
        }
      end

      def openkit_auth_url
        # "#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token"
        'https://auth.prod.latch.com/v1/oauth/token'
      end

      def openkit_url
        # ENV["Latch_OPENKIT_URL"]
        'https://rest.latchaccess.com/access/sdk'
      end

      def openkit_m2m_client_id
        # ENV['Latch_OPENKIT_M2M_CLIENT_ID']
        'hoPfwNacwmmrEKmYoPYB3zDpD5hfUzlD'
      end

      def openkit_m2m_client_secret
        # ENV['Latch_OPENKIT_M2M_CLIENT_SECRET']
        'CHLepIM3mdaq55wN9HbD8Sv-9ZdEB35Bp8L32_ZNdS4k7Dg43qfCcUnVLmP1tVs5'
      end

      def openkit_passwordless_client_id
        # ENV['Latch_OPENKIT_PASSWORDLESS_CLIENT_ID']
        'pZqocznT4mz35MFLZvniSHCHRKF2I6VL'
      end

      def openkit_passwordless_client_secret
        # ENV['Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET']
        'CNbxlpSs9HGT1qE8USr754fknmeDfu5RHxK7Ww8jZVlEvPyoJbrgIOEH_RE64H03'
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