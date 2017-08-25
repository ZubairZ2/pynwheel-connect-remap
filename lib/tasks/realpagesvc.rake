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
    response = HTTParty.post(
        "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc",
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>'http://tempuri.org/IRPXService/getfloorplanlist'},
        :body => '<soapenv:Envelope
	xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
	xmlns:tem="http://tempuri.org/"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns:xsd="http://www.w3.org/2001/XMLSchema">
	<soapenv:Header/>
	<soapenv:Body>

		<tem:getfloorplanlist>
			<tem:auth>
				<tem:pmcid>2836445</tem:pmcid>
				<tem:siteid>2836511</tem:siteid>
				<tem:username>pynwheel_service</tem:username>
				<tem:password>FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm</tem:password>
				<tem:licensekey>a915d9fa-fcb7-4300-97bb-cf3170c946af</tem:licensekey>
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
      floorplan = Floorplan.new(provider: "realpagesvc",community_id: 3)
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
    response = HTTParty.post(
        "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc",
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>'http://tempuri.org/IRPXService/getunitsbyproperty'},
        :body => '<soapenv:Envelope
                      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:tem="http://tempuri.org/"
                      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                      xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                      <soapenv:Header/>
                      <soapenv:Body>

                        <tem:getunitsbyproperty>
                          <tem:auth>
                            <tem:pmcid>2836445</tem:pmcid>
                            <tem:siteid>2836511</tem:siteid>
                            <tem:username>pynwheel_service</tem:username>
                            <tem:password>FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm</tem:password>
                            <tem:licensekey>a915d9fa-fcb7-4300-97bb-cf3170c946af</tem:licensekey>
                            <tem:system>OneSite</tem:system>
                          </tem:auth>
                        </tem:getunitsbyproperty>

                      </soapenv:Body>
                    </soapenv:Envelope>
                    ')
    result = Hash.from_xml(response.body)
    units = result["Envelope"]["Body"]["getunitsbypropertyResponse"]["getunitsbypropertyResult"]["GetUnitsByProperty"]["UnitObject"]
    units.each do |u|
      unit = Unit.new(provider: "realpagesvc",community_id: 3)
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
      # TODO unit.building remains to be set
      unit.save
    end
  end

  desc "fetch pricing data from realpage svc"
  task :realpage_price => :environment do
    response = HTTParty.post(
        "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc",
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>'http://tempuri.org/IRPXService/getunitlist'},
        :body => '<soapenv:Envelope
                      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:tem="http://tempuri.org/"
                      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                      xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                      <soapenv:Header/>
                      <soapenv:Body>

                        <tem:getunitlist>
                          <tem:auth>
                            <tem:pmcid>2836445</tem:pmcid>
                            <tem:siteid>2836511</tem:siteid>
                            <tem:username>pynwheel_service</tem:username>
                            <tem:password>FaFGpnB4YNWrHQqi7CBPmH4fITg1Sm</tem:password>
                            <tem:licensekey>a915d9fa-fcb7-4300-97bb-cf3170c946af</tem:licensekey>
                            <tem:system>OneSite</tem:system>
                          </tem:auth>
                          <tem:listCriteria>
                            <tem:ListCriterion>
                              <tem:name>Limitresults</tem:name>
                              <tem:singlevalue>False</tem:singlevalue>
                            </tem:ListCriterion>
                            <tem:ListCriterion>
                              <tem:name>DateNeeded</tem:name>
                              <tem:singlevalue>2017-12-24</tem:singlevalue>
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
    puts "*************", result["Envelope"]["Body"]["getunitlistResponse"]["getunitlistResult"]["GetUnitList"]["UnitObjects"]["UnitObject"]
    # units = result["Envelope"]["Body"]["getunitlistResponse"]["getunitlistResult"]["GetUnitList"]["UnitObjects"]["UnitObject"]["RentMatrix"]["Rows"]["Row"]["Options"]
    # units.each do |u|
    #   u["Option"].each do |opt|
    #     if opt["Best"] == "true"
    #       best_price = opt["Rent"]
    #     end
    #   end
    #   # if u["Option"]["Best"] == "true"
    #     puts "---------------"
    #   # end
    # end
    # puts "================================================================================================="
  end
end

