class RealPageGetLeasingAgentsService < BaseService
    def perform(community)
        get_leasing_agents(community)
    end

    def get_leasing_agents(community)
        use_crm_credentials = community.use_crm_credentials?
        site_ids = (use_crm_credentials ? community.crm_credential.realpage_site_id.split(',') : credentials.site_id.split(',')) rescue []
        site_ids.each do |site_id|
          begin
            url = REALPAGE_URL
            soap_action = REALPAGE_LEASING_AGENT_ACTION
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
                                <tem:getleasingagentsbyproperty>
                                    <tem:auth>
                                        <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                        <tem:siteid>'+site_id+'</tem:siteid>
                                        <tem:username>'+username+'</tem:username>
                                        <tem:password>'+password+'</tem:password>
                                        <tem:licensekey>'+license_key+'</tem:licensekey>
                                        <tem:system>OneSite</tem:system>
                                    </tem:auth>
                                </tem:getleasingagentsbyproperty>
                            </soapenv:Body>
                        </soapenv:Envelope>')
            result = Ox.load(response.body, mode: :hash)
            begin
              agents = result[:"s:Envelope"][1][:"s:Body"][1][:getleasingagentsbypropertyResponse][1][:getleasingagentsbypropertyResult][:GetLeasingAgentsByProperty][1][:Contents][:PicklistItem]
              if agents.include?({:Value=>"0", :Text=>"House"})
                agent = {:Value=>"0", :Text=>"House"}
              else
                agent = nil
              end
            rescue => e
              agent = {:Value=>"0", :Text=>"House"}
            end
            puts agent
            return agent
          rescue => e
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = "Get Leasing Agents from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
            end
          end
        end
    end
end