class RealPageInsertActivityService < BaseService
    def perform(tour_user, tour_time, avail_stops_name)
        insert_activity(tour_user, tour_time, avail_stops_name)
    end

    def insert_activity(guest, action_date, stops_name)
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
            begin
                url = REALPAGE_URL
                soap_action = REALPAGE_INSERT_ACTIVITY_ACTION
                username = REALPAGESVC_USERNAME
                password = REALPAGESVC_PASSWORD
                license_key = REALPAGESVC_LICENSE_KEY
                pmc_id = credentials.pmc_id
                
                community_id = credentials.community_id
                property_id = credentials.property_id
                action_date = action_date.strftime("%Y-%m-%d")
                
                community = Community.find community_id
                prospect = Prospect.where(tour_user_id: guest.id, community_id: community.id,  data_provider: community.data_provider).last
                
                if prospect.present?
                    guest_card_id = prospect.data[0]["Guestcard"]["NewID"] != "0" ? prospect.data[0]["Guestcard"]["NewID"] : prospect.data[0]["Guestcard"]["ID"]
                end

                agent_id = '0'                # requires addional api call, already implemented but call not working yet
                activity_type_id = '0'        # requires addional api call, already implemented but call not working yet

                if guest_card_id.present?
                    # binding.pry
                    response = HTTParty.post(
                        url,
                        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                        :body => '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                                <soapenv:Header/>
                                <soapenv:Body>
                                <tem:insertactivity>
                                    <tem:auth>
                                        <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                        <tem:siteid>'+site_id+'</tem:siteid>
                                        <tem:username>'+username+'</tem:username>
                                        <tem:password>'+password+'</tem:password>
                                    </tem:auth>
                                    <tem:activity>
                                        <tem:guestcardid>'+guest_card_id+'</tem:guestcardid>
                                        <tem:actiondate>'+action_date+'</tem:actiondate>
                                        <tem:creatorid>'+agent_id+'</tem:creatorid>
                                        <tem:typeid>'+activity_type_id+'</tem:typeid>
                                    </tem:activity>
                                </tem:insertactivity>
                                </soapenv:Body>
                            </soapenv:Envelope>')
                
                    # binding.pry
                    
                    # <tem:propertyid>'+property_id+'</tem:propertyid>
                    # <tem:unitid>'+stops_name.to_s+'</tem:unitid>
                                        
                    puts '---'*50
                    puts response
                    puts '---'*50 

                    result = Ox.load(response.body, mode: :hash)

                    # prospect_response = result[:"s:Envelope"][1][:"s:Body"][1][:insertprospectResponse][1][:insertprospectResult][:InsertProspectResponse]
                    # prospect_response = prospect_response - [prospect_response[0]]
                
                    # if prospect_response[1][:message] == "SUCCESS"
                    #     prospect = Prospect.find_or_initialize_by(community_id: community.id, data_provider: community.data_provider, tour_user_id: guest.id)
                    #     prospect.data = prospect_response
                    #     prospect.save

                    #     puts '---'*50
                    #     puts prospect_response
                    #     puts '---'*50 
                    # end
                else
                    cred = Credential.find credentials.id
                    cred.data_error_message = "missing guest card id for #{cred.community.data_provider}. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                end

            rescue => e
                begin
                    puts '==============================================='
                    cred = Credential.find credentials.id
                    cred.data_error_message = "inserting activity in #{cred.community.data_provider} is not working. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                rescue => err
                    puts '************************************************'
                end
            end
        end
    end
end