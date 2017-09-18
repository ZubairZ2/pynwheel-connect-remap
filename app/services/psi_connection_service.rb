class PsiConnectionService < BaseService
 def perform
    
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
        JSON.parse(response.body)
 end	
end