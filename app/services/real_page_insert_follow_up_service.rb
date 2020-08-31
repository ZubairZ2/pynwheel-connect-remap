class RealPageInsertFollowUpService < BaseService
    def perform(tour_user, tour_time, end_time, leasing_agent)
        insert_follow_up(tour_user, tour_time, end_time, leasing_agent)
    end

    def insert_follow_up(guest, tour_time, end_time, leasing_agent)
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
            begin
                url = REALPAGE_URL
                soap_action = REALPAGE_INSERT_FOLLOW_UP_ACTION
                username = REALPAGESVC_USERNAME
                password = REALPAGESVC_PASSWORD
                license_key = REALPAGESVC_LICENSE_KEY
                pmc_id = credentials.pmc_id
           
                community_id = credentials.community_id
                
                community = Community.find community_id
                prospect = Prospect.where(tour_user_id: guest.id, community_id: community.id,  data_provider: community.data_provider).last
                
                if prospect.present?
                    puts '-------------------------------  prospect present in insert follow up ------------------------------------'
                    puts "prospect is present"
                    puts '------------------------------------------------------------------------------------'
                    guest_card_id = prospect.data[0]["Guestcard"]["NewID"] != "0" ? prospect.data[0]["Guestcard"]["NewID"] : prospect.data[0]["Guestcard"]["ID"]
                end
                
                task_duration_start = tour_time.strftime("%Y-%m-%dT%H:%M:%S")
                task_duration_end = end_time.strftime("%Y-%m-%dT%H:%M:%S")
                task_category_cd = "R0000003"           # General appointment
                task_id =  "0"                          # For new task
                agent_id = leasing_agent[:Value]

                if guest_card_id.present?
                    puts '-------------------------------  guest_card_id  in insert follow up ------------------------------------'
                    puts guest_card_id
                    puts '------------------------------------------------------------------------------------'
                    response = HTTParty.post(
                        url,
                        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                        :body => '<soapenv:Envelope
                            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                            xmlns:tem="http://tempuri.org/">
                            <soapenv:Header/>
                            <soapenv:Body>
                                <tem:insertfollowup>
                                    <tem:auth>
                                        <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                        <tem:siteid>'+site_id+'</tem:siteid>
                                        <tem:username>'+username+'</tem:username>
                                        <tem:password>'+password+'</tem:password>
                                        <tem:licensekey>'+license_key+'</tem:licensekey>
                                    </tem:auth>
                                    <tem:followup>
                                        <tem:guestcardid>'+guest_card_id+'</tem:guestcardid>
                                        <tem:taskid>'+task_id+'</tem:taskid>
                                        <tem:agentid>'+agent_id+'</tem:agentid>
                                        <tem:taskdurationstart>'+task_duration_start+'</tem:taskdurationstart>
                                        <tem:taskdurationend>'+task_duration_end+'</tem:taskdurationend>
                                        <tem:taskcategorycd>'+task_category_cd+'</tem:taskcategorycd>
                                    </tem:followup>
                                </tem:insertfollowup>
                            </soapenv:Body>
                        </soapenv:Envelope>')
                   
                    puts '-------------------------------  response insert follow up  ------------------------------------'
                    puts response
                    puts '------------------------------------------------------------------------------------'
                    

                else
                    cred = Credential.find credentials.id
                    cred.data_error_message = "missing guest card id for #{cred.community.data_provider}. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                end
            rescue => e
                begin
                cred = Credential.find credentials.id
                cred.data_error_message = "inserting follow up in #{cred.community.data_provider} is not working. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                PaperTrail.enabled = false
                cred.save
                PaperTrail.enabled = true
                rescue => err
                end
            end
        end
    end
end