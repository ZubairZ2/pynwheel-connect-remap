class YardirentcafeMarketingApi < BaseService
  def available_slots(community)
    
    url = "https://marketingapi.rentcafe.com/marketingapi/api/appointments/AvailableSlots?MarketingAPIKey=bfa844cc-caf0-450d-bce3-124fa44e2ec1&CompanyCode=c00000074321&PropertyCode=p0552926"
    response = HTTParty.post(url,
                                 :body => {},
                                 :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

  end
end