module DataProviders
  module RealPage
    class V1ApisService

      API_METHODS = {
        get_floorplans: "getfloorplans",
        get_floorplan_list: "getfloorplanlist",
        unit_list: "unitlist",
        get_units_by_property: "getunitsbyproperty"
      }

      def initialize(community_id)
        @community = Community.find_by_id(community_id)
        @credential = @community&.credential
        @site_ids = @credential&.site_id&.split(",")
        @pmc_id = @credential&.pmc_id
      end
     
      def fetch_units_data site_id
        if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
          get_units_by_property(site_id)
        else
          get_units_list(site_id)
        end
      end

      def fetch_floorplans_data site_id
        if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
          get_floorplans_list(site_id)
        else
          get_floorplans(site_id)
        end
      end

      private

        #Touch & Map Package
        def get_floorplans site_id
          HTTParty.post(  RP_TOUCH_AND_MAP_API_URL,
                          :headers => request_headers(API_METHODS[:get_floorplans]),
                          :body => request_body(site_id, API_METHODS[:get_floorplans], ENV['RP_TOUCH_API_KEY'])
                        )
        end

        #Touch & Map Package
        def get_units_list site_id
          HTTParty.post(  RP_TOUCH_AND_MAP_API_URL,
                          :headers => request_headers(API_METHODS[:unit_list]),
                          :body => request_body(site_id, API_METHODS[:unit_list], ENV['RP_TOUCH_API_KEY'])
                        )
        end

        #Tour App Package
        def get_floorplans_list site_id
          HTTParty.post(  RP_TOUR_API_URL,
                          :headers => request_headers(API_METHODS[:get_floorplan_list]),
                          :body => request_body(site_id, API_METHODS[:get_floorplan_list], ENV['RP_TOUR_API_KEY'])
                        )
        end

        #Tour App Package
        def get_units_by_property site_id
          HTTParty.post(  RP_TOUR_API_URL,
                          :headers => request_headers(API_METHODS[:get_units_by_property]),
                          :body => request_body(site_id, API_METHODS[:get_units_by_property], ENV['RP_TOUR_API_KEY'])
                        )
        end

        def request_body site_id, api_method, license_key
          '<soapenv:Envelope 
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
            xmlns:tem="http://tempuri.org/">
            <soapenv:Header/>
            <soapenv:Body>
              <tem:'+api_method+'>
                <tem:auth>
                  <tem:pmcid>'+@pmc_id+'</tem:pmcid>
                  <tem:siteid>'+site_id+'</tem:siteid>
                  <tem:licensekey>'+license_key+'</tem:licensekey>
                </tem:auth>
                <tem:getunitlist>
                  <tem:ExtensionData/>
                </tem:getunitlist>
              </tem:'+api_method+'>
            </soapenv:Body>
          </soapenv:Envelope>'
        end
        
        def request_headers api_method
          {
            "Content-Type" => "text/xml",
            "SOAPAction" => "#{SOAP_ACTION_BASE_URL}#{api_method}"
          }
        end
    end
  end
end