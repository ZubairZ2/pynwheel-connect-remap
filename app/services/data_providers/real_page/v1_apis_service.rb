module DataProviders
  module RealPage
    class V1ApisService
      API_METHODS = {
        get_floorplans: "getfloorplans",
        get_floorplan_list: "getfloorplanlist",
        unit_list: "unitlist",
        get_units_by_property: "getunitsbyproperty",
        get_activity_types: "getactivitytypes",
        get_leasing_agents_by_property: "getleasingagentsbyproperty",
        get_marketing_sources_by_property: "getmarketingsourcesbyproperty",
        retrieve_mandatory_fees: "retrievemandatoryfees"
      }.freeze

      def initialize(community_id)
        @community = Community.find_by_id(community_id)
        @credential = @community&.credential
        @site_ids = @credential&.site_id&.split(",")
        @pmc_id = @credential&.pmc_id
      end

      def fetch_units_data(site_id)
        fetch_data(site_id, :get_units_by_property, :unit_list)
      end

      def fetch_floorplans_data(site_id)
        fetch_data(site_id, :get_floorplan_list, :get_floorplans)
      end

      def fetch_activity_types(site_id)
        fetch_data(site_id, :get_activity_types)
      end

      def fetch_leasing_agents_by_property(site_id)
        fetch_data(site_id, :get_leasing_agents_by_property)
      end

      def fetch_marketing_sources(site_id)
        fetch_data(site_id, :get_marketing_sources_by_property)
      end

      def fetch_mandatory_fees(site_id, unit_id)
        retrieve_mandatory_fees(site_id, unit_id)
      end

      private

      # primary_method is the Tour operation, fallback_method the Touch one. The
      # two are different SOAP operations with differently shaped responses, so
      # this has to agree with however the caller parses the result -- both now
      # ask Integration rather than reading the product flags independently.
      def fetch_data(site_id, primary_method, fallback_method = nil)
        method = tour? ? primary_method : fallback_method

        send(method, site_id) if method
      end

      def tour?
        Integration.tour?(@community)
      end

      def get_floorplans(site_id)
        post_request(API_METHODS[:get_floorplans], site_id)
      end

      def unit_list(site_id)
        post_request(API_METHODS[:unit_list], site_id)
      end

      def get_floorplan_list(site_id)
        post_request(API_METHODS[:get_floorplan_list], site_id)
      end

      def get_units_by_property(site_id)
        post_request(API_METHODS[:get_units_by_property], site_id)
      end

      def get_activity_types(site_id)
        post_request(API_METHODS[:get_activity_types], site_id)
      end

      def get_leasing_agents_by_property(site_id)
        post_request(API_METHODS[:get_leasing_agents_by_property], site_id)
      end

      def get_marketing_sources_by_property(site_id)
        post_request(API_METHODS[:get_marketing_sources_by_property], site_id)
      end

      def retrieve_mandatory_fees(site_id, unit_id)
        api_method = API_METHODS[:retrieve_mandatory_fees]

        soap_post(api_method) do |license_key|
          mandatory_fees_body(site_id, unit_id, api_method, license_key)
        end
      end

      def post_request(api_method, site_id)
        soap_post(api_method) { |license_key| request_body(site_id, api_method, license_key) }
      end

      # The gateway and the license key are two halves of one choice, so they are
      # resolved together here rather than passed in separately by each operation
      # -- that split is how a Tour key could be sent to the Touch URL.
      def soap_post(api_method)
        integration = Integration.for(@community)

        HTTParty.post(
          Integration.url(integration),
          {
            headers: request_headers(api_method),
            body: yield(Integration.license_key(integration))
          }.merge(Integration.http_options)
        )
      end

      def request_body(site_id, api_method, license_key)
        <<~XML
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
            <soapenv:Header/>
            <soapenv:Body>
              <tem:#{api_method}>
                <tem:auth>
                  <tem:pmcid>#{@pmc_id}</tem:pmcid>
                  <tem:siteid>#{site_id}</tem:siteid>
                  <tem:licensekey>#{license_key}</tem:licensekey>
                </tem:auth>
              </tem:#{api_method}>
            </soapenv:Body>
          </soapenv:Envelope>
        XML
      end

      def mandatory_fees_body(site_id, unit_id, api_method, license_key)
        <<~XML
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
            <soapenv:Header/>
            <soapenv:Body>
              <tem:#{api_method}>
                <tem:auth>
                  <tem:pmcid>#{@pmc_id}</tem:pmcid>
                  <tem:siteid>#{site_id}</tem:siteid>
                  <tem:licensekey>#{license_key}</tem:licensekey>
                </tem:auth>
                <tem:retrieveMandatoryFees>
                  <tem:unitID>#{unit_id}</tem:unitID>
                </tem:retrieveMandatoryFees>
              </tem:#{api_method}>
            </soapenv:Body>
          </soapenv:Envelope>
        XML
      end

      def request_headers(api_method)
        {
          "Content-Type" => "text/xml",
          "SOAPAction" => "#{SOAP_ACTION_BASE_URL}#{api_method}"
        }
      end
    end
  end
end
