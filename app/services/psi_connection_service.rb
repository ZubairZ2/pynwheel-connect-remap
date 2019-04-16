class PsiConnectionService < BaseService
  def perform
    begin
      url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
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
              "availableUnitsOnly": "0",
              "showUnitSpaces": "1"
            }
          }
        }.to_json,
        :headers => { 'Content-Type' => 'application/json' } )
      response =  response.body.gsub('@','')
      hash = JSON.parse(response)
#       ############################### Converting to own xml format
#       psi_floorplan = "<Floorplans>"
#       psi_unit = "Units"
#
#       hash["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"].each do |floor|
#         psi_floorplan = psi_floorplan + "<floorplan><IDValue>"+floor['Identification']['IDValue'].to_s+"</IDValue><Name>"+floor['Name'].to_s+"</Name><UnitCount>"+floor['UnitCount'].to_s+"</UnitCount><UnitAvailable>"+floor['UnitsAvailable'].to_s+"</UnitAvailable><DisplayedUnitsAvailable>"+floor['DisplayedUnitsAvailable'].to_s+"</DisplayedUnitsAvailable><bedroom>"+floor['Room'][0]['Count'].to_s+"</bedroom><bathroom>"+floor['Room'][1]['Count'].to_s+"</bathroom><SquareFeet>"+floor['SquareFeet']['@attributes']['Min'].to_s+"</SquareFeet><MarketRent>"+floor['MarketRent']['@attributes']['Min'].to_s+"</MarketRent></floorplan>"
#
#       end
#       psi_floorplan = psi_floorplan + "</Floorplans>"
#
#       hash["response"]["result"]["Properties"]["Property"][0]["PropertyUnits"]["PropertyUnit"].each do |u|
#         psi_unit = psi_unit+ " <Id>"+u['@attributes']['Id']+"</Id><UnitNumber>"+u['@attributes']['UnitNumber']+"</UnitNumber><FloorplanId>"+u['@attributes']['FloorplanId']+"</FloorplanId><UnitTypeId>"+u['@attributes']['UnitTypeId']+"</UnitTypeId>
# <PropertyId>"+u['@attributes']['PropertyId']+"</PropertyId><FloorPlanName>"+u['@attributes']['FloorPlanName']+"</FloorPlanName><FloorId>"+u['@attributes']['FloorId']+"
# </FloorId><BuildingId>"+u['@attributes']['BuildingId']+"</BuildingId><BuildingName>"+u['@attributes']['BuildingName']+"</BuildingName>"
#
#       end
#       psi_floorplan
    hash.to_xml
    rescue => e
      false
    end    
  end	
end