module DataProviders
  module AppFolio
    class V0ApisService
      TOKEN_CACHE_KEY     = "appfolio_api_access_token"
      TOKEN_EXPIRY_KEY    = "appfolio_api_token_expires_at"
      TOKEN_BUFFER        = 10.seconds
      DEFAULT_LAST_UPDATED_AT = "1970-01-01T00:00:00Z"

      def initialize(community_id)
        return unless community_id.present?

        @community  = Community.find_by(id: community_id)
        @credential = @community&.credential
        @company    = @community&.company
      end

      def get_resource(property_id, resource)
        return unless @credential.present?

        filter_key = resource == "properties" ? "Id" : "propertyId"
        url = "#{api_base_url}/#{resource}?filters[LastUpdatedAtFrom]=#{DEFAULT_LAST_UPDATED_AT}&filters[#{filter_key}]=#{property_id}"

        HTTParty.get(url, headers: request_headers)
      end

      private

      def request_headers
        {
          "Authorization"             => "Basic #{basic_base64_credentials}",
          "X-AppFolio-Developer-ID"   => developer_id
        }
      end

      def ensure_valid_token
        return if cached_token_valid?

        fetch_and_cache_auth_token
      end

      def cached_token_valid?
        token  = Rails.cache.read(TOKEN_CACHE_KEY)
        expiry = Rails.cache.read(TOKEN_EXPIRY_KEY)

        token.present? && expiry.present? && Time.current < (expiry - TOKEN_BUFFER)
      end

      def fetch_and_cache_auth_token
        response = HTTParty.post(
          "#{auth_base_url}/oauth/token",
          headers: { "Content-Type" => "application/x-www-form-urlencoded" },
          body: {
            grant_type:    "client_credentials",
            client_id:     client_id,
            client_secret: client_secret
          }
        )

        unless response.success?
          raise "AppFolio token fetch failed: #{response.body}"
        end

        json         = JSON.parse(response.body)
        access_token = json["access_token"]
        expires_in   = json["expires_in"].to_i

        Rails.cache.write(TOKEN_CACHE_KEY, access_token, expires_in: expires_in - TOKEN_BUFFER)
        Rails.cache.write(TOKEN_EXPIRY_KEY, Time.current + expires_in.seconds, expires_in: expires_in)
      end

      # ENV helpers
      def api_base_url
        ENV.fetch("APP_FOLIO_API_BASE_URL")
      end

      def auth_base_url
        ENV.fetch("APP_FOLIO_AUTH_BASE_URL")
      end

      def client_id
        ENV.fetch("APP_FOLIO_CLIENT_ID")
      end

      def client_secret
        ENV.fetch("APP_FOLIO_CLIENT_SECRET")
      end

      def basic_base64_credentials
        ENV.fetch("AUTH_BASIC_BASE64_Credentials")
      end

      def developer_id
        ENV.fetch("APP_FOLIO_DEVELOPER_ID")
      end
    end
  end
end
