class PsiConnectionService < BaseService
  def perform
    begin
      if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
        url = credentials.entrata_url
      else
        url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
      end
      
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
            "name": "getMitsPropertyUnits",
            "params": {
              "propertyIds": property_id,
              "availableUnitsOnly": credentials&.entrata_available_units_only,
              "showUnitSpaces": credentials&.entrata_show_unit_spaces
            }
          }
        }.to_json,
        :headers => { 'Content-Type' => 'application/json' } )

      response =  response.body.gsub('@','')
      hash = JSON.parse(response)
      
      hash.to_xml
    
    rescue => e
      false
    end    
  end	
end