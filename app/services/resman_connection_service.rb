class ResmanConnectionService < BaseService
  def perform


    begin
      property_ids = credentials.resman_property_id.split(',') rescue []
      property_id = property_ids[0]

      account_id = credentials.resman_account_id
      version = credentials.resman_api_version
      url = "#{ENV["RESMAN_BASE_URL"]}/#{version}"
      response = HTTParty.post(url,
                               :body => {
                                   "ApiKey": ENV["RESMAN_API_KEY"],
                                   "IntegrationPartnerID": ENV["RESMAN_PARTNER_ID"],
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