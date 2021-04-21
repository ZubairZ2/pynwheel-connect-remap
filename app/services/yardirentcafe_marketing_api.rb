class YardirentcafeMarketingApi < BaseService
  def available_slots(community)
    
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=#{community.crm_credentials.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credentials.yardirentcafe_company_code}&PropertyCode=#{community.crm_credentials.yardirentcafe_property_code}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end

  def schedule_tour(community,schedule_tour,tour_user)
    "https://marketingapi.rentcafe.com/marketingapi/api/appointments/createleadwithappointment?
MarketingAPIKey
=#{community.crm_credentials.yardirentcafe_marketing_api_key}&
CompanyCode
=#{community.crm_credentials.yardirentcafe_company_code}
&
PropertyId
=#{community.crm_credentials.yardirentcafe_property_id}&
FirstName
=#{tour_user.name.split(" ")[0]}&
LastName
=#{tour_user.name.split(" ")[1]}&
Email
=#{tour_user.email}
&
Phone
=#{tour_user.phone_number}&
ApptDate
=08/05/2019&
ApptTime
=04:00PM&
Source
=Website&
DesiredMoveinDate
=08/19/2019&
DesiredBedrooms
=1&
To u c h Po i n t
=Appointment"
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=#{community.crm_credentials.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credentials.yardirentcafe_company_code}&PropertyCode=#{community.crm_credentials.yardirentcafe_property_code}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end

  def cancel_tour(community)
    "https://marketingapi.rentcafe.com/marketin
gapi/api/appointments/cancelappointment?
Mark
etingAPIKey
=ca50f39f-8b89-42ad-8706-d7d5a12a922d&
CompanyCode
=c00000075117
&
PropertyId
=144236&
VoyProspectId
=42805&
VoyApptId
=458196&
ApptDate
=02/25/2020
&
ApptTime
=04:00PM"
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=#{community.crm_credentials.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credentials.yardirentcafe_company_code}&PropertyCode=#{community.crm_credentials.yardirentcafe_property_code}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end

  def lead_attribution(community)
    
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=#{community.crm_credentials.yardirentcafe_marketing_api_key}&CompanyCode=#{community.crm_credentials.yardirentcafe_company_code}&PropertyCode=#{community.crm_credentials.yardirentcafe_property_code}"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end
end