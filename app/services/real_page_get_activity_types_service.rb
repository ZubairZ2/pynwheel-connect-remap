class RealPageGetActivityTypesService < BaseService
    def perform(tour_status, community)
        get_activity_types(tour_status, community)
    end

    def get_activity_types(tour_status, community)
        use_crm_credentials = community.use_crm_credentials?
        site_ids = (use_crm_credentials ? community.crm_credential.site_id.split(',') : credentials.site_id.split(',')) rescue []
        site_ids.each do |site_id|
          begin
            url = REALPAGE_URL
            soap_action = REALPAGE_ACTIVITY_TYPES_ACTION
            pmc_id = use_crm_credentials ? community.crm_credential.realpage_pmc_id : credentials.pmc_id
            username = REALPAGESVC_USERNAME
            password = REALPAGESVC_PASSWORD
            license_key = REALPAGESVC_LICENSE_KEY
            community_id = credentials.community_id

            response = HTTParty.post(
                url,
                :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                :body => '<soapenv:Envelope
                            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                            xmlns:tem="http://tempuri.org/">
                            <soapenv:Header/>
                            <soapenv:Body>
                                <tem:getactivitytypes>
                                    <tem:auth>
                                        <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                        <tem:siteid>'+site_id+'</tem:siteid>
                                        <tem:username>'+username+'</tem:username>
                                        <tem:password>'+password+'</tem:password>
                                        <tem:licensekey>'+license_key+'</tem:licensekey>
                                        <tem:system>OneSite</tem:system>
                                    </tem:auth>
                                </tem:getactivitytypes>
                            </soapenv:Body>
                        </soapenv:Envelope>')
            
            result = Ox.load(response.body, mode: :hash)
            types = []
            begin
              pick_list_items  = result[:"s:Envelope"][1][:"s:Body"][1][:getactivitytypesResponse][1][:getactivitytypesResult][:GetActivityTypes][1][:Contents][:PicklistItem]
              activity_types = pick_list_items.map{|x| [x[:Text], x[:Value]]}
              
              is_required_type_exists = false

              activity_types.each do |type|
                if type[0] == "Self-guided - Tour"
                  types << type
                  is_required_type_exists = true
                elsif tour_status != "virutal" and type[0] == "Visit"
                  types << type
                  is_required_type_exists = true
                end
              end

              if is_required_type_exists == false
                types << activity_types[0]
              end         
            rescue => e
            end
            return types  
          rescue => e
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
            end
          end
        end
    end
end
