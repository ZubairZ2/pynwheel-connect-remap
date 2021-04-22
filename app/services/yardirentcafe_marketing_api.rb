class YardirentcafeMarketingApi < BaseService
  def available_slots(community)
    
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=#{community.crm_credential.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credential.yardirentcafe_company_code}&PropertyCode=#{community.crm_credential.yardirentcafe_property_code}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end

  def schedule_tour(community,schedule_tour,tour_user)
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/createleadwithappointment?MarketingAPIKey=#{community.crm_credential.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credential.yardirentcafe_company_code}&PropertyCode=#{community.crm_credential.yardirentcafe_property_code}&FirstName=#{tour_user.name.split(" ")[0]}&LastName=#{tour_user.name.split(" ")[1]}&Email=#{tour_user.email}&Phone=#{tour_user.phone_number}&ApptDate=#{schedule_tour.tour_date.strftime("%m/%d/%Y")}&ApptTime=#{schedule_tour.tour_time.strftime("%I:%M%p")}&Source=Website&DesiredMoveinDate=#{schedule_tour.desired_move_in_date.strftime("%m/%d/%Y")}&DesiredBedrooms=#{schedule_tour.desired_bedroom}&To u c h Po i n t=Appointment"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end

  def cancel_tour(community,schedule_tour)
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/cancelappointment?MarketingAPIKey=#{community.crm_credential.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credential.yardirentcafe_company_code}&PropertyCode=#{community.crm_credential.yardirentcafe_property_code}&VoyProspectId=#{schedule_tour.yardirentcafe_prospect_id}&VoyApptId=#{schedule_tour.yardirentcafe_appointment_id}&ApptDate=#{schedule_tour.tour_date.strftime("%m/%d/%Y")}&ApptTime=#{schedule_tour.tour_time.strftime("%I:%M%p")}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end

  def lead_attribution(community)
    
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=#{community.crm_credential.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credential.yardirentcafe_company_code}&PropertyCode=#{community.crm_credential.yardirentcafe_property_code}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end
end