class RealPageInsertActivityService < BaseService
    def perform(tour_user, tour_time, avail_stops_name, leasing_agent, activity_types,community)
        insert_activity(tour_user, tour_time, avail_stops_name, leasing_agent, activity_types, community)
    end

    def insert_activity(guest, action_date, stops_name, leasing_agent, activity_types, community)
        use_crm_credentials = community.use_crm_credentials?
        site_ids = (use_crm_credentials ? community.crm_credential.realpage_site_id.split(',') : credentials.site_id.split(',')) rescue []
        site_ids.each do |site_id|
            begin
                community_id = credentials.community_id
                @community = Community.find community_id

                if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
                    url = RP_TOUR_API_URL
                    license_key = ENV['RP_TOUR_API_KEY']
                else
                    url = RP_TOUCH_API_URL
                    license_key = ENV['RP_TOUCH_API_KEY']
                end

                soap_action = REALPAGE_INSERT_ACTIVITY_ACTION
                username = REALPAGESVC_USERNAME
                password = REALPAGESVC_PASSWORD
                pmc_id = use_crm_credentials ? community.crm_credential.realpage_pmc_id : credentials.pmc_id
                
                property_id = credentials.property_id
                action_date = action_date.strftime("%Y-%m-%d")
                agent_id = leasing_agent[:Value]
                community = Community.find community_id

                prospect = Prospect.where(tour_user_id: guest.id, community_id: community.id,  data_provider: community.data_provider).last
                
                if prospect.present?
                    guest_card_id = prospect.data[0]["Guestcard"]["NewID"] != "0" ? prospect.data[0]["Guestcard"]["NewID"] : prospect.data[0]["Guestcard"]["ID"]
                end

                if guest_card_id.present? and agent_id.present? and activity_types.present?
                    
                    puts '-------------------------------  guest_card_id  in insert activity ------------------------------------'
                    puts guest_card_id
                    puts activity_types

                    activity_ids = []
                    activity_types.each do |activity_type|
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
                                                <tem:licensekey>'+license_key+'</tem:licensekey>
                                                <tem:system>OneSite</tem:system>
                                            </tem:auth>
                                            <tem:activity>
                                                <tem:guestcardid>'+guest_card_id+'</tem:guestcardid>
                                                <tem:propertyid>'+property_id+'</tem:propertyid>
                                                <tem:actiondate>'+action_date+'</tem:actiondate>
                                                <tem:creatorid>'+agent_id+'</tem:creatorid>
                                                <tem:typeid>'+activity_type[1]+'</tem:typeid>
                                            </tem:activity>
                                        </tem:insertactivity>
                                    </soapenv:Body>
                                    </soapenv:Envelope>')

                        puts '-------------------------------  response insert activity  ------------------------------------'
                        puts response
                        
                        result = Ox.load(response.body, mode: :hash)
                        
                        # <tem:unitid>'+stops_name.to_s+'</tem:unitid>
                    
                        activity_id = result[:"s:Envelope"][1][:"s:Body"][1][:insertactivityResponse][1][:insertactivityResult][:Activity][1][:NewID] rescue ""
                        if activity_id.present?
                            activity = Hash.new
                            activity[:activity_id] = activity_id
                            if prospect.activites.present?
                                activity_count = prospect.activites.count + 1
                                activity[:activity_count] = activity_count
                                prospect.activites.push(activity)
                            else
                                activity[:activity_count] = 1
                                prospect.activites = [activity]
                            end
                            prospect.save
                        end
                        activity_ids << activity_id
                    end
                    return activity_ids[0]
                else
                    cred = Credential.find credentials.id
                    cred.data_error_message = "missing guest card id or agent_id or activity_type_id for #{cred.community.data_provider}. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                end

            rescue => e
                begin
                    cred = Credential.find credentials.id
                    cred.data_error_message = "inserting activity in #{cred.community.data_provider} is not working. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
                    PaperTrail.enabled = false
                    cred.save
                    PaperTrail.enabled = true
                rescue => err
                end
            end
        end
    end
end