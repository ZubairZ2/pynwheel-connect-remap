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
        get_marketing_sources_by_property: "getmarketingsourcesbyproperty"
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

      private

      def fetch_data(site_id, primary_method, fallback_method = nil)
        method = if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
                   primary_method
                 else
                   fallback_method
                 end
                 
        send(method, site_id) if method
      end

      def get_floorplans(site_id)
        post_request(RP_TOUCH_API_URL, API_METHODS[:get_floorplans], site_id, ENV['RP_TOUCH_API_KEY'])
      end

      def get_units_list(site_id)
        post_request(RP_TOUCH_API_URL, API_METHODS[:unit_list], site_id, ENV['RP_TOUCH_API_KEY'])
      end

      def get_floorplan_list(site_id)
        post_request(RP_TOUR_API_URL, API_METHODS[:get_floorplan_list], site_id, ENV['RP_TOUR_API_KEY'])
      end

      def get_units_by_property(site_id)
        post_request(RP_TOUR_API_URL, API_METHODS[:get_units_by_property], site_id, ENV['RP_TOUR_API_KEY'])
      end

      def get_activity_types(site_id)
        post_request(RP_TOUR_API_URL, API_METHODS[:get_activity_types], site_id, ENV['RP_TOUR_API_KEY'])
      end

      def get_leasing_agents_by_property(site_id)
        post_request(RP_TOUR_API_URL, API_METHODS[:get_leasing_agents_by_property], site_id, ENV['RP_TOUR_API_KEY'])
      end

      def get_marketing_sources_by_property(site_id)
        post_request(RP_TOUR_API_URL, API_METHODS[:get_marketing_sources_by_property], site_id, ENV['RP_TOUR_API_KEY'])
      end

      def post_request(url, api_method, site_id, license_key)
        HTTParty.post(
          url,
          headers: request_headers(api_method),
          body: request_body(site_id, api_method, license_key)
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

      def request_headers(api_method)
        {
          "Content-Type" => "text/xml",
          "SOAPAction" => "#{SOAP_ACTION_BASE_URL}#{api_method}"
        }
      end
    end
  end
end
