class PsiSpaceConfigurationConnectionService < BaseService
  def perform
    begin
      property_ids = credentials.property_id.split(',') rescue []
      property_id = property_ids[0]
      response = PsiService.call_entrata_api(
        subdomain: credentials.entrata_url,
        endpoint: "propertyunits",
        method: :post,
        payload: {
          method: {
            name: "getUnitsAvailabilityAndPricing",
            params: {
              propertyId: property_id,
              availableUnitsOnly: credentials&.entrata_available_units_only,
              showUnitSpaces: credentials&.entrata_show_unit_spaces,
              useSpaceConfiguration: credentials&.entrata_use_space_configuration
            }
          }
        }
      )
      response =  response.body
      hash = JSON.parse(response)

      if hash["response"]["result"].include?('No records found')
        api_result = "<response><code>200</code><result>No records found with mentioned preferences.</result></response>"
      else
        floorplans_xml = filter_floorplans_data(hash)
        units_xml = is_unit_space_enabled ? unit_space_enabled_pricing_update(hash) : unit_space_disabled_pricing_update(hash)
        api_result = "<Properties>"+ floorplans_xml + units_xml + "</Properties>"
      end

      api_result

    rescue => e
      false
    end
  end


  private

  def filter_floorplans_data hash
    psi_floorplan = "<Floorplans>"
    
    hash["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"].each do |floor|
      psi_floorplan = psi_floorplan + "<floorplan><IDValue>"+floor['Identification']['IDValue'].to_s+"</IDValue><Name>"+floor['Name'].to_s+"</Name><UnitCount>"+floor['UnitCount'].to_s+"</UnitCount><UnitAvailable>"+floor['UnitsAvailable'].to_s+"</UnitAvailable><DisplayedUnitsAvailable>"+floor['DisplayedUnitsAvailable'].to_s+"</DisplayedUnitsAvailable><bedroom>"+floor['Room'][0]['Count'].to_s+"</bedroom><bathroom>"+floor['Room'][1]['Count'].to_s+"</bathroom><SquareFeet>"+floor['SquareFeet']['@attributes']['Min'].to_s+"</SquareFeet><MarketRent>"+floor['MarketRent']['@attributes']['Min'].to_s+"</MarketRent></floorplan>"
    end

    psi_floorplan = psi_floorplan + "</Floorplans>"

    psi_floorplan
  end

  def is_unit_space_enabled
    ActiveRecord::Type::Boolean.new.cast(credentials&.entrata_show_unit_spaces)
  end

  def unit_space_disabled_pricing_update hash
    psi_unit = "<Units>"

    hash["response"]["result"]["ILS_Units"]["Unit"].each do |us|
      u = us[1]

      psi_unit = psi_unit+ "<Unit><Id>"+u['@attributes']['Id'].to_s+"</Id><UnitNumber>"+u['@attributes']['UnitNumber']+"</UnitNumber><FloorplanId>"+u['@attributes']['FloorplanId'].to_s+"</FloorplanId><UnitTypeId>"+u['@attributes']['UnitTypeId'].to_s+"</UnitTypeId>
      <PropertyId>"+u['@attributes']['PropertyId'].to_s+"</PropertyId><FloorPlanName>"+u['@attributes']['FloorPlanName']+"</FloorPlanName><FloorId>"+u['@attributes']['FloorId'].to_s+"
      </FloorId>"

      spaceId = us[1]["@attributes"]["Id"].present? ? us[1]["@attributes"]["Id"].to_s : "" rescue ""
      spaceUnitNumber = us[1]["@attributes"]["UnitNumber"].present? ? us[1]["@attributes"]["UnitNumber"].to_s : "" rescue ""
      spaceAvailability = us[1]["@attributes"]["Availability"].present? ? us[1]["@attributes"]["Availability"] : "" rescue ""
      spaceStatus = us[1]["@attributes"]["Status"].present? ? us[1]["@attributes"]["Status"] : "" rescue ""
      spaceConfiguration = us[1]["@attributes"]["SpaceConfiguration"].present? ? us[1]["@attributes"]["SpaceConfiguration"]: "" rescue ""
      psi_unit = psi_unit + "<UnitSpace><Id>"+spaceId+"</Id><UnitNumber>"+spaceUnitNumber+"</UnitNumber><Availability>"+spaceAvailability+"</Availability><Status>"+spaceStatus+"</Status><SpaceConfiguration>"+spaceConfiguration+"</SpaceConfiguration>"
      psi_unit = psi_unit + "<TermRent>"
    
      us[1]["Rent"]["TermRent"].each do |rent|
        leaseTerm = rent["@attributes"]["LeaseTerm"].present? ? rent["@attributes"]["LeaseTerm"].to_s : "" rescue ""
        rentPrice = rent["@attributes"]["Rent"].present? ? rent["@attributes"]["Rent"].to_s : "" rescue ""
        spaceOption = rent["@attributes"]["SpaceOption"].present? ? rent["@attributes"]["SpaceOption"] : "" rescue ""
        startDate = rent["@attributes"]["StartDate"].present? ? rent["@attributes"]["StartDate"] : "" rescue ""
        endDate = rent["@attributes"]["EndDate"].present? ? rent["@attributes"]["EndDate"] : "" rescue ""
        psi_unit = psi_unit + "<LeaseTerm>"+leaseTerm+ "</LeaseTerm><Rent>"+rentPrice+"</Rent><SpaceOption>"+spaceOption+"</SpaceOption><StartDate>"+startDate+"</StartDate><EndDate>"+endDate+"</EndDate>"
      end
      
      psi_unit = psi_unit + "</TermRent>"
      psi_unit = psi_unit + "<Rent>"+us[1]["Rent"]["@attributes"]["MinRent"].to_s+"</Rent>"
      psi_unit = psi_unit + "</UnitSpace>"
      psi_unit = psi_unit + "</Unit>"
      
    end

    psi_unit = psi_unit + "</Units>"
  end

  def unit_space_enabled_pricing_update hash
    psi_unit = "<Units>"

    hash["response"]["result"]["PropertyUnits"]["PropertyUnit"].each do |u|
      psi_unit = psi_unit+ "<Unit><Id>"+u['@attributes']['Id'].to_s+"</Id><UnitNumber>"+u['@attributes']['UnitNumber']+"</UnitNumber><FloorplanId>"+u['@attributes']['FloorplanId'].to_s+"</FloorplanId><UnitTypeId>"+u['@attributes']['UnitTypeId'].to_s+"</UnitTypeId>
      <PropertyId>"+u['@attributes']['PropertyId'].to_s+"</PropertyId><FloorPlanName>"+u['@attributes']['FloorPlanName']+"</FloorPlanName><FloorId>"+u['@attributes']['FloorId'].to_s+"
      </FloorId>"

      u['UnitSpace'].each do |us|
        spaceId = us[1]["@attributes"]["Id"].present? ? us[1]["@attributes"]["Id"].to_s : "" rescue ""
        spaceUnitNumber = us[1]["@attributes"]["UnitNumber"].present? ? us[1]["@attributes"]["UnitNumber"].to_s : "" rescue ""
        spaceAvailability = us[1]["@attributes"]["Availability"].present? ? us[1]["@attributes"]["Availability"] : "" rescue ""
        spaceStatus = us[1]["@attributes"]["Status"].present? ? us[1]["@attributes"]["Status"] : "" rescue ""
        spaceConfiguration = us[1]["@attributes"]["SpaceConfiguration"].present? ? us[1]["@attributes"]["SpaceConfiguration"]: "" rescue ""
        psi_unit = psi_unit + "<UnitSpace><Id>"+spaceId+"</Id><UnitNumber>"+spaceUnitNumber+"</UnitNumber><Availability>"+spaceAvailability+"</Availability><Status>"+spaceStatus+"</Status><SpaceConfiguration>"+spaceConfiguration+"</SpaceConfiguration>"
        psi_unit = psi_unit + "<TermRent>"
      
        us[1]["Rent"]["TermRent"].each do |rent|
          leaseTerm = rent["@attributes"]["LeaseTerm"].present? ? rent["@attributes"]["LeaseTerm"].to_s : "" rescue ""
          rentPrice = rent["@attributes"]["Rent"].present? ? rent["@attributes"]["Rent"].to_s : "" rescue ""
          spaceOption = rent["@attributes"]["SpaceOption"].present? ? rent["@attributes"]["SpaceOption"] : "" rescue ""
          startDate = rent["@attributes"]["StartDate"].present? ? rent["@attributes"]["StartDate"] : "" rescue ""
          endDate = rent["@attributes"]["EndDate"].present? ? rent["@attributes"]["EndDate"] : "" rescue ""
          psi_unit = psi_unit + "<LeaseTerm>"+leaseTerm+ "</LeaseTerm><Rent>"+rentPrice+"</Rent><SpaceOption>"+spaceOption+"</SpaceOption><StartDate>"+startDate+"</StartDate><EndDate>"+endDate+"</EndDate>"
        end

        psi_unit = psi_unit + "</TermRent>"
        psi_unit = psi_unit + "<Rent>"+us[1]["Rent"]["@attributes"]["MinRent"].to_s+"</Rent>"
        psi_unit = psi_unit + "</UnitSpace>"

      end

      psi_unit = psi_unit + "</Unit>"
    end

    psi_unit = psi_unit + "</Units>"
  end

end