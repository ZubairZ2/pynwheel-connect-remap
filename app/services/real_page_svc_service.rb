class RealPageSvcService < BaseService
	def perform
		import_realpage_svc_floorplans
    import_realpage_svc_units if Thread.current[:errors].empty?
    import_realpage_svc_price if Thread.current[:errors].empty?
	end

	def import_realpage_svc_floorplans
    begin
      url = REALPAGE_URL
      soap_action = REALPAGE_FLOORPLAN_ACTION
      pmc_id = credentials.pmc_id
      site_id = credentials.site_id
      username = REALPAGESVC_USERNAME
      password = REALPAGESVC_PASSWORD
      license_key = REALPAGESVC_LICENSE_KEY
      community_id = credentials.community_id
      response = HTTParty.post(
          url,
          :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
          :body => '<soapenv:Envelope
  	xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  	xmlns:tem="http://tempuri.org/"
  	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  	xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  	<soapenv:Header/>
  	<soapenv:Body>

  		<tem:getfloorplanlist>
  			<tem:auth>
  				<tem:pmcid>'+pmc_id+'</tem:pmcid>
  				<tem:siteid>'+site_id+'</tem:siteid>
  				<tem:username>'+username+'</tem:username>
  				<tem:password>'+password+'</tem:password>
  				<tem:licensekey>'+license_key+'</tem:licensekey>
  				<tem:system>OneSite</tem:system>
  			</tem:auth>
  		</tem:getfloorplanlist>

  	</soapenv:Body>
  </soapenv:Envelope>
  '
      )

      result = Hash.from_xml(response.body)
      unless result["Envelope"]["Body"]["Fault"].present?
        

        floorplans = result["Envelope"]["Body"]["getfloorplanlistResponse"]["getfloorplanlistResult"]["GetFloorPlanList"]["FloorPlanObject"]

        floorplans.each do |fp|
          floorplan = Floorplan.where(provider: "realpagesvc",community_id: community_id,provider_floorplan_id: fp["FloorPlanID"]).first_or_initialize  
          #floorplan = Floorplan.new(provider: "realpagesvc",community_id: community_id)
          #floorplan.provider_floorplan_id = fp["FloorPlanID"]
          if fp["FloorPlanNameMarketing"].present?
            floorplan.name = fp["FloorPlanNameMarketing"]
          elsif fp["FloorPlanCode"].present?
            if fp["FloorPlanCode"] != fp["FloorPlanName"]
              floorplan.name = fp["FloorPlanCode"] + " - " + fp["FloorPlanName"]
            else
              floorplan.name = fp["FloorPlanCode"] + " - " + fp["FloorPlanNameMarketing"]
            end
          else
            floorplan.name = fp["FloorPlanName"]
          end
          floorplan.bathrooms = fp["Bathrooms"]
          floorplan.bedrooms = fp["Bedrooms"]
          floorplan.market_rent = fp["RentMin"]
          floorplan.square_feet = fp["GrossSquareFootage"]
          floorplan.unit_count = -1
          floorplan.units_available = -1
          floorplan.deposit = 0
          floorplan.file_url = ""
          floorplan.save
        end
      else
        Thread.current[:errors] << result["Envelope"]["Body"]["Fault"]["faultstring"]  
      end
    rescue => e
      Thread.current[:errors] << e.message
    end
  end

  def import_realpage_svc_units
    building_result = realpage_building
    begin
      @array_of_dates = []
      url = REALPAGE_URL
      soap_action = REALPAGE_UNIT_ACTION
      pmc_id = credentials.pmc_id
      site_id = credentials.site_id
      username = REALPAGESVC_USERNAME
      password = REALPAGESVC_PASSWORD
      license_key = REALPAGESVC_LICENSE_KEY
      community_id = credentials.community_id
      response = HTTParty.post(
          url,
          :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
          :body => '<soapenv:Envelope
                        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:tem="http://tempuri.org/"
                        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                        <soapenv:Header/>
                        <soapenv:Body>

                          <tem:getunitsbyproperty>
                            <tem:auth>
                              <tem:pmcid>'+pmc_id+'</tem:pmcid>
                              <tem:siteid>'+site_id+'</tem:siteid>
                              <tem:username>'+username+'</tem:username>
                              <tem:password>'+password+'</tem:password>
                              <tem:licensekey>'+license_key+'</tem:licensekey>
                              <tem:system>OneSite</tem:system>
                            </tem:auth>
                          </tem:getunitsbyproperty>

                        </soapenv:Body>
                      </soapenv:Envelope>
                      ')
      result = Hash.from_xml(response.body)
      unless result["Envelope"]["Body"]["Fault"].present?
        units = result["Envelope"]["Body"]["getunitsbypropertyResponse"]["getunitsbypropertyResult"]["GetUnitsByProperty"]["UnitObject"]
        units.each do |u|
          unit = Unit.where(provider: "realpagesvc",community_id: community_id,provider_unit_id: u["UnitID"]).first_or_initialize
          #unit = Unit.new(provider: "realpagesvc",community_id: community_id)
          unit.property_id = u["SiteID"]
          #unit.provider_unit_id = u["UnitID"]
          unit.unit_type = u["UnitNumber"]
          unit.marketing_name = u["UnitNumber"]
          unit.floorplan_id = u["FloorplanID"]
          unit.market_rent = u["BaseRentAmount"]
          unit.effective_rent = u["BaseRentAmount"]
          unit.availability = u["AvailableBit"] == "true" ? "Unoccupied" : "Occupied"
          if u["AvailableDate"].present?
            unit.available_date = u["AvailableDate"]
          end

          if u["MadeReadyDate"].present?
            unit.available_date = u["MadeReadyDate"]
          end
          if unit.available_date.year == 1900
            unit.available_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
          end
          if unit.availability == "Occupied" && unit.available_date < Date.today
            unit.available_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
          end
          
         
          if unit.available_date < Date.today
            @array_of_dates << Date.today
          elsif unit.available_date != Date.parse("2099-1-1")
            @array_of_dates << unit.available_date
          end
          @array_of_dates = @array_of_dates.uniq

          unit.building = ""
          bldgResult = getBuildingNumber(u["BuildingID"],building_result)
          if bldgResult.present?
            if bldgResult == "N/A"
              unit.building = ""
            else
              unit.building = bldgResult
            end
          end
          unit.save
        end
      else
         Thread.current[:errors] << result["Envelope"]["Body"]["Fault"]["faultstring"]   
      end
      
    rescue => e
      Thread.current[:errors] << e.message
    end
  end

  def import_realpage_svc_price
    begin
      url = REALPAGE_URL
      soap_action = REALPAGE_PRICE_ACTION 
      pmc_id = credentials.pmc_id
      site_id = credentials.site_id
      username = REALPAGESVC_USERNAME
      password = REALPAGESVC_PASSWORD
      license_key = REALPAGESVC_LICENSE_KEY
      community_id = credentials.community_id
      @array_of_dates.each do |date|
        response = HTTParty.post(
            url,
            :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
            :body => '<soapenv:Envelope
                          xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:tem="http://tempuri.org/"
                          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                          xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                          <soapenv:Header/>
                          <soapenv:Body>

                            <tem:getunitlist>
                              <tem:auth>
                                <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                <tem:siteid>'+site_id+'</tem:siteid>
                                <tem:username>'+username+'</tem:username>
                                <tem:password>'+password+'</tem:password>
                                <tem:licensekey>'+license_key+'</tem:licensekey>
                                <tem:system>OneSite</tem:system>
                              </tem:auth>
                              <tem:listCriteria>
                                <tem:ListCriterion>
                                  <tem:name>Limitresults</tem:name>
                                  <tem:singlevalue>False</tem:singlevalue>
                                </tem:ListCriterion>
                                <tem:ListCriterion>
                                  <tem:name>DateNeeded</tem:name>
                                  <tem:singlevalue>'+date.to_s+'</tem:singlevalue>
                                </tem:ListCriterion>
                              </tem:listCriteria>
                              <tem:listCriteria>
                                <tem:name>LeaseTerms</tem:name>
                                <tem:singlevalue>12</tem:singlevalue>
                              </tem:listCriteria>
                            </tem:getunitlist>

                          </soapenv:Body>
                        </soapenv:Envelope>')
        result = Hash.from_xml(response.body)
        unless result["Envelope"]["Body"]["Fault"].present?
          units = result["Envelope"]["Body"]["getunitlistResponse"]["getunitlistResult"]["GetUnitList"]["UnitObjects"]["UnitObject"]
          units.each do |u|
            unit_no = u["Address"]["UnitID"].to_i
            unit = Unit.where(provider: "realpagesvc",community_id: community_id, provider_unit_id: unit_no)
            puts " ----------- ", unit_no
            best_price = nil

            u["RentMatrix"]["Rows"]["Row"]["Options"].each do |opt|
              # units = result["Envelope"]["Body"]["getunitlistResponse"]["getunitlistResult"]["GetUnitList"]["UnitObjects"]["UnitObject"]["RentMatrix"]["Rows"]["Row"]["Options"]
              opt["Option"].each do |o|
                if o["Best"] == "true"
                  best_price = o["Rent"]
                end
              end
            end
            if best_price.present? && unit.present?
              unit.first.update_attributes(effective_rent: best_price)
              puts " **** price updated *** "
            end
          end
        else
           Thread.current[:errors] << result["Envelope"]["Body"]["Fault"]["faultstring"]   
        end
      end  
    rescue => e
      Thread.current[:errors] << e.message
    end
  end

  def realpage_building
    begin
      url = REALPAGE_URL
      soap_action = REALPAGE_BUILDING_ACTION
      pmc_id = credentials.pmc_id
      site_id = credentials.site_id
      username = REALPAGESVC_USERNAME
      password = REALPAGESVC_PASSWORD
      license_key = REALPAGESVC_LICENSE_KEY
      response = HTTParty.post(
          url,
          :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
          :body => '<soapenv:Envelope
                      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:tem="http://tempuri.org/"
                      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                      xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                      <soapenv:Header/>
                      <soapenv:Body>

                        <tem:getpicklist>
                          <tem:auth>
                            <tem:pmcid>'+pmc_id+'</tem:pmcid>
                            <tem:siteid>'+site_id+'</tem:siteid>
                            <tem:username>'+username+'</tem:username>
                            <tem:password>'+password+'</tem:password>
                            <tem:licensekey>'+license_key+'</tem:licensekey>
                            <tem:system>OneSite</tem:system>
                          </tem:auth>
                          <tem:lType>LIST_BUILDING</tem:lType>
                        </tem:getpicklist>

                      </soapenv:Body>
                    </soapenv:Envelope>
                    ')
      result = Hash.from_xml(response.body)
      unless result["Envelope"]["Body"]["Fault"].present?
        return result["Envelope"]["Body"]["getpicklistResponse"]["getpicklistResult"]["GetPickList"]["Contents"]["PicklistItem"]
      else
         Thread.current[:errors] << result["Envelope"]["Body"]["Fault"]["faultstring"]    
      end  
    rescue => e
      Thread.current[:errors] << e.message
    end
  end

  def getBuildingNumber(building_no, building_result)
    if building_result["Value"] == building_no
      return building_result["Text"]
    else
      return ""
    end
  end
end