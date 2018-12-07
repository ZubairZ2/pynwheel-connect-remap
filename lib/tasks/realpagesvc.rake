require 'savon'

namespace :dataprovider do

  desc 'fetch floorplans data from realpage scv'
  task :realpage_floorplans => :environment do
#     client = Savon.client(wsdl: 'https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc?wsdl')
#     # puts '------------', client.operations
#
#     # response = client.call(:getfloorplanlist, message: { auth: {pmcid: 2836445, siteid: 2836511, username: "pynwheel_service", password: "FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm", licensekey: "a915d9fa-fcb7-4300-97bb-cf3170c946af", system: "OneSite"} })
#     response = client.call(:getunitlist, xml: <soapenv:Envelope
# 	xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
# 	xmlns:tem="http://tempuri.org/"
# 	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
# 	xmlns:xsd="http://www.w3.org/2001/XMLSchema">
# 	<soapenv:Header/>
# 	<soapenv:Body>
# 		<tem:getunitlist>
# 			<tem:auth>
# 				<tem:pmcid>2836445</tem:pmcid>
# 				<tem:siteid>2836511</tem:siteid>
# 				<tem:username>pynwheel_service</tem:username>
# 				<tem:password>FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm</tem:password>
# 				<tem:licensekey>a915d9fa-fcb7-4300-97bb-cf3170c946af</tem:licensekey>
# 				<tem:system>OneSite</tem:system>
# 			</tem:auth>
# 			<tem:listCriteria>
# 				<tem:ListCriterion>
# 					<tem:name>Limitresults</tem:name>
# 					<tem:singlevalue>False</tem:singlevalue>
# 				</tem:ListCriterion>
# 				<tem:ListCriterion>
# 					<tem:name>DateNeeded</tem:name>
# 					<tem:singlevalue>2017-08-19</tem:singlevalue>
# 				</tem:ListCriterion>
# 			</tem:listCriteria>
# 			<tem:listCriteria>
# 				<tem:name>LeaseTerms</tem:name>
# 				<tem:singlevalue>12</tem:singlevalue>
# 			</tem:listCriteria>
# 		</tem:getunitlist>
# 	</soapenv:Body>
# </soapenv:Envelope>)
#     puts '***********', response.body
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getfloorplanlist'
    pmc_id = "2836445"
    site_id = "2836511"
    username = "pynwheel_service"
    password = "FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm"
    license_key = "a915d9fa-fcb7-4300-97bb-cf3170c946af"
    community_id = 3
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

    floorplans = result["Envelope"]["Body"]["getfloorplanlistResponse"]["getfloorplanlistResult"]["GetFloorPlanList"]["FloorPlanObject"]

    floorplans.each do |fp|
      floorplan = Floorplan.new(provider: "realpagesvc",community_id: community_id)
      floorplan.provider_floorplan_id = fp["FloorPlanID"]
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
    puts "========= Floor plans imported ==========="
  end

  desc "fetch units data from realpage scv"
  task :realpage_units => :environment do
    building_result = realpage_building
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getunitsbyproperty'
    pmc_id = "2836445"
    site_id = "2836511"
    username = "pynwheel_service"
    password = "FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm"
    license_key = "a915d9fa-fcb7-4300-97bb-cf3170c946af"
    community_id = 3
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
    units = result["Envelope"]["Body"]["getunitsbypropertyResponse"]["getunitsbypropertyResult"]["GetUnitsByProperty"]["UnitObject"]
    units.each do |u|
      unit = Unit.new(provider: "realpagesvc",community_id: community_id)
      unit.property_id = u["SiteID"]
      unit.provider_unit_id = u["UnitID"]
      unit.name = u["UnitNumber"]
      unit.number = u["UnitNumber"]
      unit.floorplan_id = u["FloorplanID"]
      unit.avg_rent = u["BaseRentAmount"]
      unit.min_rent = u["BaseRentAmount"]
      unit.max_rent = u["BaseRentAmount"]
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
  end

  desc "fetch pricing data from realpage svc"
  task :realpage_price => :environment do
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getunitlist'
    pmc_id = "2836445"
    site_id = "2836511"
    username = "pynwheel_service"
    password = "FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm"
    license_key = "a915d9fa-fcb7-4300-97bb-cf3170c946af"
    community_id = 3
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
                              <tem:singlevalue>'+Date.today.strftime("%Y-%m-%d") +'</tem:singlevalue>
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
        unit.first.update_attributes(min_rent: best_price)
        puts " **** price updated *** "
      end
      # puts "================================================================================================="
    end
  end
end

def realpage_building
  url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
  soap_action = 'http://tempuri.org/IRPXService/getpicklist'
  pmc_id = "2836445"
  site_id = "2836511"
  username = "pynwheel_service"
  password = "FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm"
  license_key = "a915d9fa-fcb7-4300-97bb-cf3170c946af"
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
  return result["Envelope"]["Body"]["getpicklistResponse"]["getpicklistResult"]["GetPickList"]["Contents"]["PicklistItem"]
end

def getBuildingNumber(building_no, building_result)
  if building_result["Value"] == building_no
    return building_result["Text"]
  else
    return ""
  end
end

