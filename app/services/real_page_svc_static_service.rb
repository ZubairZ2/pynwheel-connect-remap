class RealPageSvcStaticService < BaseService
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
              floorplan = Floorplan.where(provider: "realpagesvc",community_id: community_id,provider_floorplan_id: fp[:FloorPlanID]).first_or_initialize

              if fp[:FloorPlanNameMarketing].present?
                floorplan.name = fp[:FloorPlanNameMarketing]
              elsif fp[:FloorPlanCode].present?
                if fp[:FloorPlanCode] != fp[:FloorPlanName]
                  floorplan.name = fp[:FloorPlanCode] + " - " + fp[:FloorPlanName]
                else
                  floorplan.name = fp[:FloorPlanCode] + " - " + fp[:FloorPlanNameMarketing]
                end
              else
                floorplan.name = fp[:FloorPlanName]
              end
              floorplan.bathrooms = fp[:Bathrooms]
              floorplan.bedrooms = fp[:Bedrooms]
              # floorplan.market_rent = fp[:RentMin]
              floorplan.square_feet = fp[:GrossSquareFootage]
              floorplan.save(:validate => false)

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
        @array_of_dates = [{ready_date: Date.today,units: []}]
        current_date = Date.today

        url = REALPAGE_URL
        soap_action = REALPAGE_UNIT_ACTION
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
        result = Ox.load(response.body, mode: :hash)
        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          units = result[:"s:Envelope"][1][:"s:Body"][1][:getunitsbypropertyResponse][1][:getunitsbypropertyResult][:GetUnitsByProperty]
          units.each do |u|

            if u.key?(:UnitObject)
              u = u[:UnitObject]
              hit = false
              unit = Unit.where(provider: "realpagesvc",community_id: community_id,provider_unit_id: u[:UnitID]).first_or_initialize
              unless unit.manual_override
                unit.property_id = u[:SiteID]
                unit.provider_unit_id = u[:UnitID]
                unit.unit_type = u[:UnitNumber]
                if u[:BuildingID].present?
                  unit.marketing_name = u[:BuildingID] + "-" + u[:UnitNumber]
                else
                  unit.marketing_name = u[:UnitNumber]
                end
                unit.floorplan_id = u[:FloorplanID]
                # unit.market_rent = u[:BaseRentAmount]
                unit.effective_rent = u[:BaseRentAmount].to_f > 0 ? u[:BaseRentAmount] : 1
                # unit.availability = u[:AvailableBit] == "true" ? "Unoccupied" : "Occupied"
                if u[:RentSqFtCount].present?
                  unit.square_feet = u[:RentSqFtCount]
                end
                #unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                unit.floor = u[:FloorNumber] rescue nil
                if u[:AvailableDate].present?
                  unit.available_date = u[:AvailableDate]
                end

                if u[:MadeReadyDate].present?
                  unit.available_date = u[:MadeReadyDate]
                end
                if unit.available_date.year == 1900
                  unit.available_date = ""
                end
                if unit.availability == "Occupied" #&& unit.available_date < Date.today
                  unit.available_date = ""
                end

                if unit.available_date.present?
                  current_date = unit.available_date
                elsif unit.available_date.present? && unit.available_date < Date.today
                  current_date = Date.today
                end

                @array_of_dates.each do |hash|
                  if hash[:ready_date] == current_date
                    hash[:units] << unit.provider_unit_id
                    hit = true
                  end
                end

                if !hit
                  struct = {
                      ready_date: current_date,
                      units: [unit.provider_unit_id]
                  }
                  @array_of_dates << struct
                end


                # unit.building = ""
                # bldgResult = getBuildingNumber(u["BuildingID"],building_result)
                # if bldgResult.present?
                #   if bldgResult == "N/A"
                #     unit.building = ""
                #   else
                #     unit.building = bldgResult
                #   end
                # end
                unit.manually_updated = false
                unit.save(validate: false)
                #puts "++++++++++++++++++++++///////// ", unit.errors.message.join(',')
              end
            end
          end
        end

      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def import_realpage_svc_price
    site_ids = credentials.site_id.split(',') rescue []
    site_ids.each do |site_id|
      begin
        url = REALPAGE_URL
        soap_action = REALPAGE_PRICE_ACTION
        pmc_id = credentials.pmc_id
        #site_id = credentials.site_id
        username = REALPAGESVC_USERNAME
        password = REALPAGESVC_PASSWORD
        license_key = REALPAGESVC_LICENSE_KEY
        community_id = credentials.community_id

        @array_of_dates.each do |hash|
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
                                  <tem:singlevalue>'+hash[:ready_date].to_s+'</tem:singlevalue>
                                </tem:ListCriterion>
                              </tem:listCriteria>
                              <tem:listCriteria>
                                <tem:name>LeaseTerms</tem:name>
                                <tem:singlevalue>12</tem:singlevalue>
                              </tem:listCriteria>
                            </tem:getunitlist>

                          </soapenv:Body>
                        </soapenv:Envelope>')
          #result = Hash.from_xml(response.body) This method consumes too much memory on heroku
          result = Ox.load(response.body, mode: :hash)
          if result[:"s:Envelope"][1][:"s:Body"][1].present?

            units = result[:"s:Envelope"][1][:"s:Body"][1][:getunitlistResponse][1][:getunitlistResult][:GetUnitList][1][:UnitObjects][:UnitObject]


            #Old code
            # units.each do |u|
            #   unit_no = u[:Address][:UnitID].to_i
            #   unit = Unit.where(provider: "realpagesvc",community_id: community_id, provider_unit_id: unit_no)
            #   if unit.present?
            #     hash[:units].each do |unit_in_array|
            #       if unit_in_array == unit.first.id
            #         best_price = nil
            #         if u[:RentMatrix].present?
            #           u[:RentMatrix][1][:Rows][:Row][1][:Options].each do |opt|
            #             if opt.key?(:Option)
            #               o  = opt[:Option][0]
            #               if o[:Best] == "true"
            #                 best_price = o[:Rent]
            #               end
            #             end
            #           end
            #           if best_price.present? && unit.present?
            #             unit.first.effective_rent = best_price
            #             unit.first.save(:validate => false)
            #             puts " **** price updated *** "
            #           end
            #         end
            #       end
            #     end
            #   end
            # end

            #Refactor code
            units.each do |u|
              unit_no = u[:Address][:UnitID]
              if hash[:units].include?(unit_no)
                if u[:RentMatrix].present?
                  best_price = nil
                  u[:RentMatrix][1][:Rows][:Row][1][:Options].each do |opt|
                    if opt.key?(:Option)
                      o  = opt[:Option][0]
                      if o[:Best] == "true"
                        best_price = o[:Rent]
                      end
                    end
                  end
                  if best_price.present?
                    unit = Unit.find_by(provider: "realpagesvc",community_id: community_id, provider_unit_id: unit_no.to_i)
                    unit.effective_rent = best_price
                    unit.save(:validate => false)
                    puts " **** price updated *** "
                  end
                end
              end
            end
          end
        end
      rescue => e
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