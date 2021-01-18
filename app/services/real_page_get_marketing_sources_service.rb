class RealPageGetMarketingSourcesService < BaseService
    def perform(community)
        get_marketing_sources_by_property(community)
    end

    def get_marketing_sources_by_property(community)
        use_crm_credentials = community.use_crm_credentials?
        site_ids = (use_crm_credentials ? community.crm_credential.site_id.split(',') : credentials.site_id.split(',')) rescue []
        site_ids.each do |site_id|
          begin
            url = REALPAGE_URL
            soap_action = REALPAGE_MARKETING_SOURCES_ACTION
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
                                <tem:getmarketingsourcesbyproperty>
                                    <tem:auth>
                                        <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                        <tem:siteid>'+site_id+'</tem:siteid>
                                        <tem:username>'+username+'</tem:username>
                                        <tem:password>'+password+'</tem:password>
                                        <tem:licensekey>'+license_key+'</tem:licensekey>
                                        <tem:system>OneSite</tem:system>
                                    </tem:auth>
                                </tem:getmarketingsourcesbyproperty>
                            </soapenv:Body>
                        </soapenv:Envelope>')
            result = Ox.load(response.body, mode: :hash)
            marketing_sources = result[:"s:Envelope"][1][:"s:Body"][1][:getmarketingsourcesbypropertyResponse][1][:getmarketingsourcesbypropertyResult][:GetMarketingSourcesByProperty][1][:Contents][:PicklistItem]
            cred = Credential.find_by_id credentials.id
            cred.update_attributes(realpage_marketing_sources: marketing_sources)
          rescue => e
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = "Get Marketing Sources from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
            end
          end
        end
    end
end