class PsiConnectionService < BaseService
  def perform
    begin
      property_ids = credentials.property_id.split(',') rescue []
      property_id = property_ids[0]
      puts "Property ID: #{property_id}"
      response = PsiService.call_entrata_api(
        subdomain: credentials.entrata_url,
        endpoint: "propertyunits",
        method: :post,
        payload: {
          method: {
            name: "getMitsPropertyUnits",
            params: {
              propertyIds: property_id,
              availableUnitsOnly: credentials&.entrata_available_units_only,
              showUnitSpaces: credentials&.entrata_show_unit_spaces
            }
          }
        }
      )
      response =  response.body.gsub('@','')
      puts "Response: #{response}"
      hash = JSON.parse(response)
      
      hash.to_xml
    
    rescue => e
      false
    end    
  end	
end