module GoogleSheets
  # Reads ONE tab of a Google Sheet and hands back its rows as hashes keyed by a
  # normalized version of the header row ("AF Unit Integration ID" ->
  # "af_unit_integration_id"), so callers match columns by meaning instead of by
  # position — feed owners insert and reorder columns without telling anyone.
  #
  #   GoogleSheets::Reader.new(spreadsheet_id).rows("Data Feed")
  #   # => [{ "af_unit_integration_id" => "d959a7be-…", "rently_listing_url" => "https://…", … }, …]
  #
  # Two ways in, picked automatically:
  #
  #   1. A service account, when ENV["GOOGLE_SERVICE_ACCOUNT_JSON"] is set (raw
  #      JSON or base64 of it). Share the sheet with that account's client_email
  #      as a Viewer. This is the only option for a sheet that is not
  #      link-shared, and the one to use in production.
  #   2. Google's public CSV endpoint, when there are no credentials. Works only
  #      while the doc is "anyone with the link can view" (or published to the
  #      web) and needs no setup at all — handy for a one-off backfill.
  #
  # Read-only by construction: the only scope requested is spreadsheets.readonly
  # and there is no write path here.
  class Reader
    class Error < StandardError; end

    TOKEN_URI    = "https://oauth2.googleapis.com/token".freeze
    SCOPE        = "https://www.googleapis.com/auth/spreadsheets.readonly".freeze
    API_ROOT     = "https://sheets.googleapis.com/v4/spreadsheets".freeze
    GVIZ_URI     = "https://docs.google.com/spreadsheets/d/%s/gviz/tq".freeze
    # Wide enough for any feed we consume; the API only returns columns that
    # actually hold data, so asking for A:ZZ costs nothing.
    RANGE_COLUMNS = "A:ZZ".freeze
    # Google's tokens live an hour. Expiring ours early means a slow clock or a
    # long-running job never gets a 401 on a token that expired mid-flight.
    TOKEN_TTL    = 50.minutes
    HTTP_TIMEOUT = 30

    # "AF Unit Integration ID" -> "af_unit_integration_id". Anything that is not
    # a letter or digit collapses to a single underscore, so "Unit #" and
    # "Unit  #" and "unit_#" all land on the same key.
    def self.normalize_header(value)
      value.to_s.strip.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/\A_+|_+\z/, "")
    end

    def initialize(spreadsheet_id, credentials_json: ENV["GOOGLE_SERVICE_ACCOUNT_JSON"])
      @spreadsheet_id   = spreadsheet_id
      @credentials_json = credentials_json.presence
    end

    # Returns an Array of Hashes, one per non-empty data row. Blank cells come
    # back as nil rather than "", so `presence`-style checks read naturally at
    # the call site.
    def rows(tab_name)
      to_hashes(@credentials_json ? api_grid(tab_name) : csv_grid(tab_name))
    end

    def authenticated?
      @credentials_json.present?
    end

    private

    # --- fetching ----------------------------------------------------------

    def api_grid(tab_name)
      # The tab name is single-quoted because "Data Feed" contains a space; a
      # literal quote inside a tab name is escaped by doubling it.
      range = "'#{tab_name.to_s.gsub("'", "''")}'!#{RANGE_COLUMNS}"
      url   = "#{API_ROOT}/#{@spreadsheet_id}/values/#{ERB::Util.url_encode(range)}"

      response = HTTParty.get(
        url,
        headers: { "Authorization" => "Bearer #{access_token}" },
        # FORMATTED_VALUE gives us exactly what the CSV path gives us, so both
        # ways in produce identical strings and callers never have to care.
        query: { majorDimension: "ROWS", valueRenderOption: "FORMATTED_VALUE" },
        timeout: HTTP_TIMEOUT
      )
      raise Error, "Sheets API #{response.code}: #{response.body.to_s.truncate(300)}" unless response.success?

      Array(response.parsed_response["values"])
    end

    def csv_grid(tab_name)
      response = HTTParty.get(
        format(GVIZ_URI, @spreadsheet_id),
        query: { tqx: "out:csv", sheet: tab_name },
        follow_redirects: true,
        timeout: HTTP_TIMEOUT
      )
      unless response.success?
        raise Error, "CSV export #{response.code} — the sheet is not link-shared, so " \
                     "GOOGLE_SERVICE_ACCOUNT_JSON must be set and the sheet shared with that account"
      end

      CSV.parse(response.body.to_s)
    end

    # --- header mapping ----------------------------------------------------

    def to_hashes(grid)
      header = Array(grid.first).map { |cell| self.class.normalize_header(cell) }
      return [] if header.all?(&:blank?)

      grid.drop(1).filter_map do |row|
        attrs = {}
        header.each_with_index do |key, index|
          next if key.blank?

          attrs[key] = row[index].to_s.strip.presence
        end
        attrs if attrs.any? { |_, value| value.present? }
      end
    end

    # --- service-account auth ----------------------------------------------

    def access_token
      Rails.cache.fetch(token_cache_key, expires_in: TOKEN_TTL) { request_access_token }
    end

    def token_cache_key
      "google_sheets/access_token/#{Digest::SHA256.hexdigest(service_account['client_email'].to_s)}"
    end

    def request_access_token
      now = Time.now.to_i
      assertion = JWT.encode(
        { iss: service_account["client_email"], scope: SCOPE, aud: TOKEN_URI, iat: now, exp: now + 3600 },
        OpenSSL::PKey::RSA.new(service_account["private_key"].to_s),
        "RS256"
      )

      response = HTTParty.post(
        TOKEN_URI,
        body: { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: assertion },
        timeout: HTTP_TIMEOUT
      )
      raise Error, "Google token exchange #{response.code}: #{response.body.to_s.truncate(300)}" unless response.success?

      response.parsed_response["access_token"].presence ||
        raise(Error, "Google token exchange returned no access_token")
    end

    def service_account
      @service_account ||= begin
        raw = @credentials_json.to_s
        # Accept the JSON key file verbatim or base64-encoded, since a
        # multi-line PEM inside an env var is awkward on some hosts.
        raw = Base64.decode64(raw) unless raw.lstrip.start_with?("{")
        JSON.parse(raw)
      rescue JSON::ParserError => e
        raise Error, "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON (#{e.message})"
      end
    end
  end
end
