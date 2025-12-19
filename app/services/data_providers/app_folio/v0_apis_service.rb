module DataProviders
  module AppFolio
    class V0ApisService
      DEFAULT_LAST_UPDATED_AT = "1970-01-01T00:00:00Z"

      def initialize(community_id)
        return unless community_id.present?

        @community  = Community.find_by(id: community_id)
        @credential = @community&.credential
        @company    = @community&.company
      end

      def get_resource(property_ids, resource, filter_key = nil)
        return unless @credential.present?

        url = "#{base_url}/api/v0/#{resource}?filters[LastUpdatedAtFrom]=#{DEFAULT_LAST_UPDATED_AT}"

        if filter_key.present?
          ids = normalize_ids(property_ids)
          url += "&filters[#{filter_key}]=#{CGI.escape(ids.join(','))}" if ids.any?
        end

        HTTParty.get(url, headers: request_headers)
      end

      private

      def normalize_ids(value)
        Array(value)
          .flat_map { |v| v.to_s.split(',') }
          .map(&:strip)
          .reject(&:blank?)
          .uniq
      end

      def request_headers
        {
          "Authorization"             => "Bearer #{fetch_auth_token}",
          "X-AppFolio-Developer-ID"   => developer_id,
          "X-AppFolio-Database-ID"    => @credential.app_folio_database_id
        }
      end

      def fetch_auth_token
        response = HTTParty.post(
          "#{base_url}/oauth/token",
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

        JSON.parse(response.body)["access_token"]
      end

      def base_url
        ENV.fetch("APP_FOLIO_BASE_URL")
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
    end
  end
end
