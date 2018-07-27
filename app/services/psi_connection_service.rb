class PsiConnectionService < BaseService
 def perform
    begin
        url = credentials.url
        password = credentials.password
        username = credentials.username
        property_id = credentials.property_id
        response = HTTParty.post(url,
                               :body => {
                                   "auth": {
                                   "type": "basic",
                                   "password": password,
                                   "username": username
                               },
                               "method": {
          "name": "getMitsPropertyUnits",
          "params": {
              "propertyIds": property_id,
          "availableUnitsOnly": "0"
        }
        }
        }.to_json,
        :headers => { 'Content-Type' => 'application/json' } )
        response =  response.body.gsub('@','')
        hash = JSON.parse(response)
        hash.to_xml
    rescue=>e
      false
    end    
 end	
end