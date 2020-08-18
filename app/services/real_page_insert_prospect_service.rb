class RealPageInsertProspectService < BaseService
    def perform(tour_user)
        insert_prospect(tour_user)
    end

    def insert_prospect(guest)
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
            begin
                url = REALPAGE_URL
                soap_action = REALPAGE_INSERT_PROSPECT
                pmc_id = credentials.pmc_id
                #site_id = credentials.site_id
                username = REALPAGESVC_USERNAME
                password = REALPAGESVC_PASSWORD
                license_key = REALPAGESVC_LICENSE_KEY
                community_id = credentials.community_id
                phone_number = guest.phone_number.present? ? guest.phone_number : ''
                first_name = guest.first_name.present? ? guest.first_name : guest.name
                last_name = guest.last_name.present? ? guest.last_name : 'missing'
                
                response = HTTParty.post(
                    url,
                    :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                    :body => '<soapenv:Envelope
                    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:tem="http://tempuri.org/">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:insertprospect>
                            <tem:auth>
                                <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                <tem:siteid>'+site_id+'</tem:siteid>
                                <tem:username>'+username+'</tem:username>
                                <tem:password>'+password+'</tem:password>
                                <tem:licensekey>'+license_key+'</tem:licensekey>
                                <tem:system>OneSite</tem:system>
                            </tem:auth>
                            <tem:guestcard>
                                <tem:prospects>
                                    <tem:Prospect>
                                        <tem:firstname>'+first_name+'</tem:firstname>
                                        <tem:lastname>'+last_name+'</tem:lastname>
                                        <tem:email>'+guest.email+'</tem:email>
                                        <tem:numbers>
                                            <tem:phonenumbers>
                                                <tem:PhoneNumber>
                                                    <tem:number>' + phone_number + '</tem:number>
                                                    <tem:ExtensionData/>
                                                </tem:PhoneNumber>
                                            </tem:phonenumbers>
                                            <tem:ExtensionData/>
                                        </tem:numbers>
                                        <tem:gender>F</tem:gender>
                                        <tem:ExtensionData/>
                                    </tem:Prospect>
                                </tem:prospects>
                                <tem:ExtensionData/>
                            </tem:guestcard>
                        </tem:insertprospect>
                    </soapenv:Body>
                </soapenv:Envelope>')
            
                
                result = Ox.load(response.body, mode: :hash)
                prospect_response = result[:"s:Envelope"][1][:"s:Body"][1][:insertprospectResponse][1][:insertprospectResult][:InsertProspectResponse]
                prospect_response = prospect_response - [prospect_response[0]]
            
                if prospect_response[1][:message] == "SUCCESS"
                    community = Community.find community_id
                    prospect = Prospect.find_or_initialize_by(community_id: community.id, data_provider: community.data_provider, tour_user_id: guest.id)
                    prospect.data = prospect_response
                    prospect.save

                    puts '---'*50
                    puts prospect_response
                    puts '---'*50 
                end

            rescue => e
                begin
                cred = Credential.find credentials.id
                cred.data_error_message = "inserting propsect in #{cred.community.data_provider} is not working. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                PaperTrail.enabled = false
                cred.save
                PaperTrail.enabled = true
                rescue => err
                end
            end
        end
    end
end