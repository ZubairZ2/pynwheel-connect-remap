class PsiPricingConnectionService < BaseService
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
                                       "name": "getUnitsAvailabilityAndPricing",
                                       "params": {
                                           "propertyId": property_id,
                                           "availableUnitsOnly": credentials&.entrata_available_units_only,
                                           "showUnitSpaces": credentials&.entrata_show_unit_spaces
                                       }
                                   }
                               }.to_json,
                               :headers => { 'Content-Type' => 'application/json' } )
      response =  response.body
      hash = JSON.parse(response)

      ############################### Converting to own xml format
      if hash["response"]["result"].include?('No records found')
        api_result = "<response><code>200</code><result>No records found with mentioned preferences.</result></response>"
      else
        psi_floorplan = "<Floorplans>"
        psi_unit = "Units"

        hash["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"].each do |floor|
          # byebug
          psi_floorplan = psi_floorplan + "<floorplan><IDValue>"+floor['Identification']['IDValue'].to_s+"</IDValue><Name>"+floor['Name'].to_s+"</Name><UnitCount>"+floor['UnitCount'].to_s+"</UnitCount><UnitAvailable>"+floor['UnitsAvailable'].to_s+"</UnitAvailable><DisplayedUnitsAvailable>"+floor['DisplayedUnitsAvailable'].to_s+"</DisplayedUnitsAvailable><bedroom>"+floor['Room'][0]['Count'].to_s+"</bedroom><bathroom>"+floor['Room'][1]['Count'].to_s+"</bathroom><SquareFeet>"+floor['SquareFeet']['@attributes']['Min'].to_s+"</SquareFeet><MarketRent>"+floor['MarketRent']['@attributes']['Min'].to_s+"</MarketRent></floorplan>"

        end
        psi_floorplan = psi_floorplan + "</Floorplans>"

        # byebug
        psi_unit = "<Units>"
        hash["response"]["result"]["PropertyUnits"]["PropertyUnit"].each do |u|
          # byebug
          psi_unit = psi_unit+ "<Unit><Id>"+u['@attributes']['Id'].to_s+"</Id><UnitNumber>"+u['@attributes']['UnitNumber']+"</UnitNumber><FloorplanId>"+u['@attributes']['FloorplanId'].to_s+"</FloorplanId><UnitTypeId>"+u['@attributes']['UnitTypeId'].to_s+"</UnitTypeId>
          <PropertyId>"+u['@attributes']['PropertyId'].to_s+"</PropertyId><FloorPlanName>"+u['@attributes']['FloorPlanName']+"</FloorPlanName><FloorId>"+u['@attributes']['FloorId'].to_s+"
          </FloorId>"
          u['UnitSpace'].each do |us|
            # byebug
            psi_unit = psi_unit + "<UnitSpace><Id>"+us[1]["@attributes"]["Id"].to_s+"</Id><UnitNumber>"+us[1]["@attributes"]["UnitNumber"].to_s+"</UnitNumber><Availability>"+us[1]["@attributes"]["Availability"]+"</Availability><Status>"+us[1]["@attributes"]["Status"]+"</Status>"
            psi_unit = psi_unit + "<TermRent>"
            us[1]["Rent"]["TermRent"].each do |rent|
              # byebug
              psi_unit = psi_unit + "<LeaseTerm>"+rent["@attributes"]["LeaseTerm"].to_s+ "</LeaseTerm><Rent>"+rent["@attributes"]["Rent"].to_s+"</Rent>"
            end
            psi_unit = psi_unit + "</TermRent>"
            psi_unit = psi_unit + "<Rent>"+us[1]["Rent"]["@attributes"]["MinRent"].to_s+"</Rent>"
            psi_unit = psi_unit + "</UnitSpace>"
          end
          psi_unit = psi_unit + "</Unit>"
        end
        psi_unit = psi_unit + "</Units>"
        api_result = "<Properties>"+ psi_floorplan + psi_unit + "</Properties>"
      end

      # psi_floorplan

      ########################
      api_result


      # hash.to_xml
    rescue => e
      false
    end
  end
end