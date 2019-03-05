class PsiPricingConnectionService < BaseService
  def perform
    begin
      url = "https://"+credentials.url+".entrata.com/api/v1/propertyunits"
      password = credentials.password
      username = credentials.username
      property_ids = credentials.property_id.split(',') rescue []
      property_id = property_ids[0]
      response = HTTParty.post(url,
                               :body => {
                                   "auth": {
                                       "type": "basic",
                                       "password": password,
                                       "username": username
                                   },
                                   "method": {
                                       "name": "getUnitsAvailabilityAndPricing",
                                       "params": {
                                           "propertyId": property_id,
                                           "availableUnitsOnly": "0"
                                       }
                                   }
                               }.to_json,
                               :headers => { 'Content-Type' => 'application/json' } )
      response =  response.body.gsub('@','')
      hash = JSON.parse(response)
      # hash.to_xml
    rescue => e
      false
    end
  end
end