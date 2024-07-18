class RealPageInsertProspectService < BaseService
    def perform(tour_user, appointment_time, marketing_source, desired_move_in_date, community)
        insert_prospect(tour_user, appointment_time, marketing_source, desired_move_in_date, community)
    end

    def insert_prospect(guest, appointment_time, marketing_source, desired_move_in_date, community)
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

                soap_action = REALPAGE_INSERT_PROSPECT
                username = REALPAGESVC_USERNAME
                password = REALPAGESVC_PASSWORD
                pmc_id = use_crm_credentials ? community.crm_credential.realpage_pmc_id : credentials.pmc_id
                
                phone_number = guest.phone_number.present? ? guest.phone_number : ''
                first_name = guest.first_name.present? ? guest.first_name : guest.name
                last_name = guest.last_name.present? ? guest.last_name : 'missing'

                year , month, date, hour, minute = appointment_time.strftime("%Y-%m-%d-%H-%M").split("-")
                if marketing_source.present?
                    collection = '<tem:primaryleadsource>' + marketing_source + '</tem:primaryleadsource><tem:appointment><tem:year>' + year + '</tem:year><tem:month>' + month + '</tem:month><tem:day>' + date + '</tem:day> <tem:hour>' + hour + '</tem:hour><tem:minute>' + minute + '</tem:minute><tem:leasingagentid>0</tem:leasingagentid></tem:appointment>'
                else
                    collection = '<tem:appointment><tem:year>' + year + '</tem:year><tem:month>' + month + '</tem:month><tem:day>' + date + '</tem:day> <tem:hour>' + hour + '</tem:hour><tem:minute>' + minute + '</tem:minute><tem:leasingagentid>0</tem:leasingagentid></tem:appointment>'
                end
                needed_date = desired_move_in_date.present? ? ('<tem:dateneeded>' + desired_move_in_date.strftime("%Y-%m-%d") + '</tem:dateneeded>') : ''

                puts '-------------------------------  data in insert prospect  ------------------------------------'
                puts collection
                puts needed_date

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
                            <tem:guestcard>'+ collection +'<tem:prospects>
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
                                        <tem:ExtensionData/>
                                    </tem:Prospect>
                                </tem:prospects>
                                <tem:preferences>'+ needed_date + '<tem:ExtensionData/>
                                </tem:preferences>
                                <tem:ExtensionData/>
                            </tem:guestcard>
                        </tem:insertprospect>
                    </soapenv:Body>
                </soapenv:Envelope>')
            
                puts '-------------------------------  response of insert prospect  ------------------------------------'
                puts response

                result = Ox.load(response.body, mode: :hash)
                prospect_response = result[:"s:Envelope"][1][:"s:Body"][1][:insertprospectResponse][1][:insertprospectResult][:InsertProspectResponse]
                prospect_response = prospect_response - [prospect_response[0]]
            
                if prospect_response[1][:message] == "SUCCESS"
                    community = Community.find community_id
                    prospect = Prospect.find_or_initialize_by(community_id: community.id, data_provider: community.data_provider, tour_user_id: guest.id)
                    prospect.data = prospect_response
                    prospect.save
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

    def scheduled_tour(time, community_id,tour_user_id)
        current_datetime = time.strftime('%d/%m/%Y %l:%M %p')
        current_time = current_datetime.to_datetime.strftime('%l:%M %p')
        current_date = current_datetime.to_datetime.strftime('%d/%m/%Y')
        current_tour = SchedualTour.new(tour_date: current_date, tour_time: current_time)
        SchedualTour.where('community_id = ? and tour_user_id = ? and tour_date = ? and end_time >= ? and tour_time <= ?', community_id, tour_user_id, current_tour.tour_date, current_tour.tour_time, current_tour.tour_time).last
    end
end