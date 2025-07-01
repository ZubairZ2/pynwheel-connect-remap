module DataProviders
  module AppFolio
    class V0ApisService
      TOKEN_CACHE_KEY = "appfolio_api_access_token"
      TOKEN_EXPIRY_KEY = "appfolio_api_token_expires_at"
      TOKEN_BUFFER_SECONDS = 10 # refresh slightly before real expiry

      def initialize(_community_id = nil)
        # No per-community setup needed
      end

      def get_resource(resource_path)
        ensure_valid_token

        url = "#{api_base_url}/api/v0#{resource_path}"
        headers = {
          'Authorization' => "Bearer #{Rails.cache.read(TOKEN_CACHE_KEY)}",
          'X-AppFolio-Developer-ID' => developer_id,
          'X-AppFolio-Database-ID' => database_id
        }

        HTTParty.get(url, headers: headers)
      end

      private

      def ensure_valid_token
        return if valid_cached_token?

        fetch_and_store_auth_token
      end

      def valid_cached_token?
        token = Rails.cache.read(TOKEN_CACHE_KEY)
        expiry = Rails.cache.read(TOKEN_EXPIRY_KEY)

        token.present? && expiry.present? &&
          Time.current < (expiry - TOKEN_BUFFER_SECONDS)
      end

      def fetch_and_store_auth_token
        response = HTTParty.post(
          "#{auth_base_url}/oauth/token",
          headers: { 'Content-Type' => 'application/x-www-form-urlencoded' },
          body: {
            grant_type: grant_type,
            client_id: client_id,
            client_secret: client_secret
          }
        )

        raise "AppFolio token fetch failed: #{response.body}"  unless response.success?

        json = JSON.parse(response.body)
        access_token = json["access_token"]
        expires_in = json["expires_in"].to_i

        Rails.cache.write(TOKEN_CACHE_KEY, access_token, expires_in: expires_in - TOKEN_BUFFER_SECONDS)
        Rails.cache.write(TOKEN_EXPIRY_KEY, Time.current + expires_in.seconds, expires_in: expires_in)
      end

      def grant_type
        "client_credentials"
      end

      def auth_base_url
        ENV.fetch("APP_FOLIO_AUTH_BASE_URL")
      end

      def api_base_url
        ENV.fetch("APP_FOLIO_API_BASE_URL")
      end

      def client_id
        ENV.fetch("APP_FOLIO_CLIENT_ID")
      end

      def client_secret
        ENV.fetch("APP_FOLIO_CLIENT_SECRET")
      end

      def developer_id
        ENV.fetch("APP_FOLIO_DEVELOPER_ID")
      end

      def database_id
        ENV.fetch("APP_FOLIO_DATABASE_ID")
      end
    end
  end
end
