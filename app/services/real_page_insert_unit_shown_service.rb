class RealPageInsertUnitShownService < BaseService
    def perform(tour_user, tour_time, visited_stop, leasing_agent, activity_id)
        insert_unit_shown(tour_user, tour_time, visited_stop, leasing_agent, activity_id)
    end

    def insert_unit_shown(guest, activity_date, unit_shown, leasing_agent, activity_id)
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
            begin
                url = REALPAGE_URL
                soap_action = REALPAGE_INSERT_UNIT_SHOWN_ACTION
                username = REALPAGESVC_USERNAME
                password = REALPAGESVC_PASSWORD
                license_key = REALPAGESVC_LICENSE_KEY
                pmc_id = credentials.pmc_id

                community_id = credentials.community_id
                activity_date = activity_date.strftime("%Y-%m-%d")
                agent_id = leasing_agent[:Value]
               
                community = Community.find community_id
                prospect = Prospect.where(tour_user_id: guest.id, community_id: community.id,  data_provider: community.data_provider).last
                
                if prospect.present?
                    puts '-------------------------------  prospect is present in insert unit shown  ------------------------------------'
                    guest_card_id = prospect.data[0]["Guestcard"]["NewID"] != "0" ? prospect.data[0]["Guestcard"]["NewID"] : prospect.data[0]["Guestcard"]["ID"]
                end
                
                if guest_card_id.present? and activity_id.present?
                    puts '-------------------------------  guest_card_id in insert unit shown ------------------------------------'
                    puts guest_card_id
                    puts '--------------------------------------------------------------------------------------------------------'

                    response = HTTParty.post(
                        url,
                        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                        :body => '<soapenv:Envelope
                            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                            xmlns:tem="http://tempuri.org/">
                            <soapenv:Header/>
                            <soapenv:Body>
                                <tem:insertunitshown>
                                    <tem:auth>
                                        <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                        <tem:siteid>'+site_id+'</tem:siteid>
                                        <tem:username>'+username+'</tem:username>
                                        <tem:password>'+password+'</tem:password>
                                        <tem:licensekey>'+license_key+'</tem:licensekey>
                                        <tem:system>OneSite</tem:system>
                                    </tem:auth>
                                    <tem:unitshown>
                                        <tem:guestcardid>'+guest_card_id+'</tem:guestcardid>
                                        <tem:activityid>'+activity_id+'</tem:activityid>
                                        <tem:activitydate>'+activity_date+'</tem:activitydate>
                                        <tem:unitnumber>'+unit_shown+'</tem:unitnumber> 
                                        <tem:agentid>'+agent_id+'</tem:agentid>
                                    </tem:unitshown>
                                </tem:insertunitshown>
                            </soapenv:Body>
                        </soapenv:Envelope>')

                    puts '-------------------------------  response insert unit shown  ------------------------------------'
                    puts response
                    puts '-------------------------------------------------------------------------------------------------'

                else
                    cred = Credential.find credentials.id
                    cred.data_error_message = "missing guest card id or activity id for #{cred.community.data_provider}. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                    puts '-------------------------------  in else  ------------------------------------'
                end
            rescue => e
                begin
                    cred = Credential.find credentials.id
                    cred.data_error_message = "inserting unit shown in #{cred.community.data_provider} is not working. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                    puts '-------------------------------  rescued  ------------------------------------'
                rescue => err
                end
            end
        end
    end
end