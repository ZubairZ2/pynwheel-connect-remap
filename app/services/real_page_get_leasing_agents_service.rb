class RealPageGetLeasingAgentsService < BaseService
    def perform
        get_leasing_agents
    end

    def get_leasing_agents
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
          begin
            url = REALPAGE_URL
            soap_action = REALPAGE_LEASING_AGENT_ACTION
            pmc_id = credentials.pmc_id
            #site_id = credentials.site_id
            username = REALPAGESVC_USERNAME
            password = REALPAGESVC_PASSWORD
            license_key = REALPAGESVC_LICENSE_KEY
            community_id = credentials.community_id
 
            response = HTTParty.post(
                url,
                :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                :body => '<soapenv:Envelope
                            xmlns:soapenv=“http://schemas.xmlsoap.org/soap/envelope/”
                            xmlns:tem=“http://tempuri.org/”>
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
        
            binding.pry
            
            puts '---'*50
            puts response
            puts '---'*50

          rescue => e
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
            end
            #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
          end
        end
    end
end