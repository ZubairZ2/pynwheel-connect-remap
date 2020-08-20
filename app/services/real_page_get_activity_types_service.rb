class RealPageGetActivityTypesService < BaseService
    def perform
        get_activity_types
    end

    def get_activity_types
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
          begin
            url = REALPAGE_URL
            soap_action = REALPAGE_ACTIVITY_TYPES_ACTION
            pmc_id = credentials.pmc_id
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
            type = nil
            begin
              result[:"s:Envelope"][1][:"s:Body"][1][:getactivitytypesResponse][1][:getactivitytypesResult][:GetActivityTypes][1][:Contents][:PicklistItem].each do |type_data|
                if type_data[:Text] == "Self-guided - Tour" or type_data[:Text] == "Self-guided" or type_data[:Text] == "Tour"
                  type = type_data
                  break
                elsif type_data[:Text] == "Visit"
                  type = type_data
                  break
                else
                  type = result[:"s:Envelope"][1][:"s:Body"][1][:getactivitytypesResponse][1][:getactivitytypesResult][:GetActivityTypes][1][:Contents][:PicklistItem][0]
                end
              end
            rescue => e
                begin
                  type = result[:"s:Envelope"][1][:"s:Body"][1][:getactivitytypesResponse][1][:getactivitytypesResult][:GetActivityTypes][1][:Contents][:PicklistItem][0]
                rescue => e
                  type = ''
                end
            end
            puts type
            return type  
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
