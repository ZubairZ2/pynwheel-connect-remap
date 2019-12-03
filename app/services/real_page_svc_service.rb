class RealPageSvcService < BaseService
  def perform
    import_realpage_svc_floorplans
    import_realpage_svc_units 
    import_realpage_svc_price
  end

  def import_realpage_svc_floorplans
    site_ids = credentials.site_id.split(',') rescue []
    site_ids.each do |site_id|
      begin
        url = REALPAGE_URL
        soap_action = REALPAGE_FLOORPLAN_ACTION
        pmc_id = credentials.pmc_id
        #site_id = credentials.site_id
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
                  </soapenv:Envelope>')

        #result = Hash.from_xml(response.body) #That method was taking too much memory on heroku
        result = Ox.load(response.body, mode: :hash)
        if result[:"s:Envelope"][1][:"s:Body"][1].present?  
          floorplans = result[:"s:Envelope"][1][:"s:Body"][1][:getfloorplanlistResponse][1][:getfloorplanlistResult][:GetFloorPlanList]
          floorplans.each do |fp|
            if fp.key?(:FloorPlanObject)
              fp = fp[:FloorPlanObject]
              floorplan = Floorplan.find_by(provider: "realpagesvc",community_id: community_id,provider_floorplan_id: fp[:FloorPlanID])#.first_or_initialize
              if floorplan.present?
                # if fp[:FloorPlanNameMarketing].present?
                #   floorplan.name = fp[:FloorPlanNameMarketing]
                # elsif fp[:FloorPlanCode].present?
                #   if fp[:FloorPlanCode] != fp[:FloorPlanName]
                #     floorplan.name = fp[:FloorPlanCode] + " - " + fp[:FloorPlanName]
                #   else
                #     floorplan.name = fp[:FloorPlanCode] + " - " + fp[:FloorPlanNameMarketing]
                #   end
                # else
                #   floorplan.name = fp[:FloorPlanName]
                # end
                # floorplan.bathrooms = fp[:Bathrooms]
                # floorplan.bedrooms = fp[:Bedrooms]
                unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated && floorplan.manual_override
                  floorplan.market_rent = fp[:RentMin]
                end

                # floorplan.square_feet = fp[:GrossSquareFootage]
                floorplan.save(:validate => false)
              end
            end
          end
        end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
      end
    end
  end

  def import_realpage_svc_units
    #building_result = realpage_building #Ignore it for now
    site_ids = credentials.site_id.split(',') rescue []
    site_ids.each do |site_id|
      begin
        @array_of_dates = []
        @array_of_units = []
        current_date = Date.today
     
        url = REALPAGE_URL
        soap_action = REALPAGE_PRICE_ACTION
        pmc_id = credentials.pmc_id
        #site_id = credentials.site_id
        username = REALPAGESVC_USERNAME
        password = REALPAGESVC_PASSWORD
        license_key = REALPAGESVC_LICENSE_KEY
        date_needed = Date.today + 540
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
                                  <tem:singlevalue>'+date_needed.to_s+'</tem:singlevalue>
                                </tem:ListCriterion>
                              </tem:listCriteria>
                              <tem:listCriteria>
                                <tem:name>LeaseTerms</tem:name>
                                <tem:singlevalue>12</tem:singlevalue>
                              </tem:listCriteria>
                            </tem:getunitlist>

                          </soapenv:Body>
                        </soapenv:Envelope>')
        sleep 2
        result = Ox.load(response.body, mode: :hash)
        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          units = result[:"s:Envelope"][1][:"s:Body"][1][:getunitlistResponse][1][:getunitlistResult][:GetUnitList][1][:UnitObjects][:UnitObject]
          units.each do |u|

            unit = Unit.find_by(provider: "realpagesvc",community_id: community_id,provider_unit_id: u[:Address][:UnitID])#.first_or_initialize
            @array_of_units << u[:Address][:UnitID]
            if unit.present?


              unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated  && (unit.manual_override)
                if u[:RentMatrix].present?
                  unit.effective_rent = u[:RentMatrix][1][:Rows][:Row][0][:MinRent].to_f > 0 ? u[:RentMatrix][1][:Rows][:Row][0][:MinRent] : 1
                else
                  unit.effective_rent = u[:BaseRentAmount]
                end
                # unit.min_effective_rent = u[:RentMatrix][1][:Rows][:Row][0][:MinRent].to_f > 0 ? u[:RentMatrix][1][:Rows][:Row][0][:MinRent] : 1
                # unit.max_effectent_rent = u[:RentMatrix][1][:Rows][:Row][0][:MaxRent].to_f > 0 ? u[:RentMatrix][1][:Rows][:Row][0][:MaxRent] : 0
              end

              unless unit.availability_is_updated.present? && unit.availability_is_updated && (unit.manual_override)
                unit.availability = u[:Availability][:AvailableBit] == "true" ? "Unoccupied" : "Occupied"
              end

              unless unit.available_date_is_updated.present? && unit.available_date_is_updated && (unit.manual_override)
                if u[:Availability][:AvailableDate].present?
                  availableDate = u[:Availability][:AvailableDate].split("/")[1] + "/" + u[:Availability][:AvailableDate].split("/")[0] + "/" + u[:Availability][:AvailableDate].split("/")[2]
                  unit.available_date = availableDate
                end

                unless u[:Availability][:AvailableDate].present?
                  availableDate = u[:Availability][:VacantDate][3..4] + "/" + u[:Availability][:VacantDate][0..1] + "/" + u[:Availability][:VacantDate][5..9]
                  unit.available_date = availableDate
                end
              end
              unless unit.available_is_updated.present? && unit.available_is_updated && (unit.manual_override)
                if unit.availability == "Occupied"
                  unit.available = false
                else
                  unit.available = true
                end

              end
              unit.availability_url = "https://pynwheelapp.com/communities/#{community_id}/webpages/apply_now?MoveInDate=#{Date.today.day}/#{Date.today.month}/#{Date.today.year}&UnitId=#{unit.provider_unit_id}&SearchUrl="

              unit.save(validate: false)
              #puts "++++++++++++++++++++++///////// ", unit.errors.message.join(',')
            end
          end
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = nil
            cred.save
          rescue => err
          end
        else
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            cred.save
          rescue => err
          end
        end
      
      rescue => e
        begin
          cred = Credential.find credentials.id
          cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
          PaperTrail.enabled = false
          cred.save
          PaperTrail.enabled = true
        rescue => err
        end
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
      end
    end
  end

  def import_realpage_svc_price
    site_ids = credentials.site_id.split(',') rescue []
    units_str = ""
    @array_of_units.each do |us|
      units_str = units_str + "<tem:int>"+us+"</tem:int>"
    end
    site_ids.each do |site_id|
      begin
        url = REALPAGE_URL
        soap_action = 'http://tempuri.org/IRPXService/getrentmatrix'
        pmc_id = credentials.pmc_id
        #site_id = credentials.site_id
        username = REALPAGESVC_USERNAME
        password = REALPAGESVC_PASSWORD
        license_key = REALPAGESVC_LICENSE_KEY
        community_id = credentials.community_id

        date_check = Date.today + 540
        response = HTTParty.post(
            url,
            :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
            :body => '<soapenv:Envelope
                    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:tem="http://tempuri.org/">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:getrentmatrix>
                            <tem:auth>
                                <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                <tem:siteid>'+site_id+'</tem:siteid>
                                <tem:username>'+username+'</tem:username>
                                <tem:password>'+password+'</tem:password>
                                <tem:licensekey>'+license_key+'</tem:licensekey>
                                <tem:system>OneSite</tem:system>
                            </tem:auth>
                            <tem:getrentmatrix>
                                <tem:NeededByDate>'+date_check.to_s+'</tem:NeededByDate>
                                <tem:LeaseTerm>12</tem:LeaseTerm>
                                <tem:unitids>
                                    <!--Zero or more repetitions:-->
                                    '+units_str.to_s+'
                                </tem:unitids>
                                <tem:viewingQuoteOnly>1</tem:viewingQuoteOnly>
                            </tem:getrentmatrix>
                        </tem:getrentmatrix>
                    </soapenv:Body>
                </soapenv:Envelope>')
        sleep 2
        #result = Hash.from_xml(response.body) This method consumes too much memory on heroku
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          byebug

          units = result[:"s:Envelope"][1][:"s:Body"][1][:getrentmatrixResponse][1][:getrentmatrixResult][:GetRentMatrix][1][:RentMatrices][:RentMatrix]


          units.each do |u|
            rentStr = ""
            unitLeaseTerm = []

            unit_no = u[1][:Rows][:Row][0][:Unit]
            unit_add = u[1][:Rows][:Row][0][:Building]

            unit_min_rent = u[1][:Rows][:Row][0][:MinRent]
            unit_max_rent = u[1][:Rows][:Row][0][:MaxRent]
            best_price = nil
            begin

              u[1][:Rows][:Row][1][:Options].each_with_index do |opts,index|
                next if index == 0

                startdate = u[1][:Rows][:Row][1][:Options][0][:LeaseStartDate]
                next if index == 0
                unless unitLeaseTerm.include?(opts[:Option][0][:LeaseTerm].to_s)
                  rentStr = rentStr + (opts[:Option][0][:LeaseTerm].to_s) + ":" + opts[:Option][0][:Rent] + "::" + startdate + ":" + opts[:Option][0][:LeaseEndDate].to_s + "\;"
                  # unitLeaseTerm << opt[:Option][0][:LeaseTerm].to_s
                end
                # hashData = {(u[:RentMatrix][1][:Rows][:Row][index][:Options][ind][:Option][0][:LeaseTerm].to_s) => [u[:RentMatrix][1][:Rows][:Row][index][:Options][ind][:Option][0][:Rent], startdate, u[:RentMatrix][1][:Rows][:Row][index][:Options][ind][:Option][0][:LeaseEndDate] ]}
                # unitHash.merge! hashData
              end

                # unitHash = (unitHash.sort_by {|k, v| k.to_i}).to_h
            rescue => ex
              puts ex

              unitHash = nil
            end

            if unit_min_rent.present?
              unit = Unit.find_by(provider: "realpagesvc",community_id: community_id, marketing_name: unit_no,building: unit_add)
              unless unit.present?
                unit = Unit.find_by(provider: "realpagesvc",community_id: community_id, marketing_name: unit_no)
              end
              if unit.present?
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated  && (unit.manual_override)
                  unit.effective_rent = unit_min_rent
                end
                unit.min_effective_rent = unit_min_rent
                unit.max_effective_rent = unit_max_rent
                unit.lease_pricing = rentStr
                byebug
                unit.save(:validate => false)
                # @doc = @doc + response.body
                puts " **** price updated *** ",unit.marketing_name
              end

            end
          end
        end
      rescue => e
        puts "Pricing Error ********************", e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
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
        #Thread.current[:errors] << result["Envelope"]["Body"]["Fault"]["faultstring"]    
        puts '-----------------------------------------' , result["Envelope"]["Body"]["Fault"]["faultstring"] 
        ExceptionNotifier.notify_exception(Exception.new,data: {message: result["Envelope"]["Body"]["Fault"]["faultstring"],community_id: credentials.community_id})  
      end  
    rescue => e
      #Thread.current[:errors] << e.message
      puts '-------------------------------------', e.message
      #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
    end
  end

  def getBuildingNumber(building_no, building_result)
    if building_result.is_a?(Array)
      building = building_result.select{|x| x if x['Value'] == building_no}
      if building.present?
        return building.first["Text"]
      else
        return ""
      end
    else
      if building_result["Value"] == building_no
        return building_result["Text"]
      else
        return ""
      end
    end
  end
end