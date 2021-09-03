class ResmanConnectionService < BaseService
  def perform


    begin
      property_ids = credentials.resman_property_id.split(',') rescue []
      property_id = property_ids[0]

      account_id = credentials.resman_account_id
      #property_id = credentials.property_id
   
      url = "https://api.myresman.com/MITS/GetMarketing2_0"
      response = HTTParty.post(url,
                               :body => {
                                   "ApiKey": '9412bd2716b648c1b00b62643e63850b',
                                   "IntegrationPartnerID": '1214',
                                   "AccountID": account_id,
                                   "PropertyID": property_id,
                               },
                               :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )
      response =  response.body.gsub('@','')
      hash = JSON.parse(response)
      hash.to_xml
    rescue => e
      response
    end
  end
end