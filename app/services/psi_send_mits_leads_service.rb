class PsiSendMitsLeadsService < BaseService
  def perform(tour_user, tour_time, end_time, visited_stops, community)
      use_crm_credentials = community.use_crm_credentials?
      property_ids = (use_crm_credentials ? community.crm_credential.property_id.split(',') : credentials.property_id.split(',')) rescue []
      property_ids.each do |property_id|
        entrata_domain = (use_crm_credentials ? community.crm_credential.entrata_domain : credentials.entrata_url)
        if entrata_domain.include?('https://') || entrata_domain.include?('http://')
            url = credentials.entrata_url
        else
            url = "https://"+entrata_domain+".entrata.com/api/leads"
        end

        password = use_crm_credentials ? community.crm_credential.entrata_password : credentials.password
        username = use_crm_credentials ? community.crm_credential.entrata_username : credentials.username

        first_name = tour_user.first_name.present? ? tour_user.first_name : tour_user.name
        last_name = tour_user.last_name.present? ? tour_user.last_name : 'missing'
        phone_number = tour_user.phone_number.present? ? tour_user.phone_number : ""

        tour_data = scheduled_tour(tour_time, credentials.community_id, tour_user.id)
        desired_bedroom = tour_data.desired_bedroom.present? ? tour_data.desired_bedroom : "" rescue ""
        desired_move_in_date = tour_data.desired_move_in_date.present? ? tour_data.desired_move_in_date.strftime("%m/%d/%Y") : "" rescue ""

        response = HTTParty.post(url,
                                :body => {
                                    "auth": {
                                        "type": "basic",
                                        "password": password,
                                        "username": username
                                    },
                                    "method": {
                                        "name": "sendMitsLeads",
                                        "params": {
                                          "propertyId": property_id,
                                          "doNotSendConfirmationEmail": "1",
                                          "isWaitList": "0",
                                          "Prospects": {
                                            "Prospect": [
                                              {
                                                "TransactionData": {
                                                    "OriginatingLeadSource": "Phone Book",
                                                    "InternetListingService": "Pynwheel"
                                                },
                                                "LastUpdateDate": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
                                                "LeasingAgentId": "",
                                                "Customers": {
                                                  "Customer": {
                                                    "Name": {
                                                      "FirstName": first_name,
                                                      "LastName": last_name
                                                    },
                                                    "Phone": [
                                                      {
                                                        "PhoneNumber": phone_number,
                                                        "@attributes": { "PhoneType": "personal" }
                                                      }
                                                    ],
                                                    "Email": tour_user.email
                                                  }
                                                },
                                                "customerPreferences": {
                                                    "desiredMoveInDate": desired_move_in_date,
                                                    "DesiredNumBedrooms": {
                                                      "@attributes": {"Exact": desired_bedroom}
                                                    }
                                                },
                                                "events": {
                                                  "event": [
                                                    {
                                                      "type": "Self Tour",
                                                      "date": tour_time.strftime("%m/%d/%Y"),
                                                      "timeFrom": tour_time.strftime("%I:%M %P"),
                                                      "timeTo": end_time.strftime("%I:%M %P"),
                                                      "TourVisitedStops": visited_stops
                                                    }
                                                  ]
                                                }
                                              }
                                            ]
                                          }
                                        }
                                      }
                                }.to_json,
                                :headers => { 'Content-Type' => 'application/json' } )
        
        response =  JSON.parse(response.body)
        
        if response["response"]["code"] == 200
          community = Community.find credentials.community_id
          prospect = Prospect.find_or_initialize_by(community_id: community.id, data_provider: community.data_provider, tour_user_id: tour_user.id)
          prospect.data = response["response"]["result"]
          prospect.save

          puts '---'*10
          puts response["response"]["result"]
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