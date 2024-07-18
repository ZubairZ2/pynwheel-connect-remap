class RealPageSvcStaticService < BaseService
  def perform
    @array_of_units = []
    @apply_now_base_url = get_availability_base_url(credentials.community_id)
    
    @community = Community.find credentials.community_id
    
    if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
      import_realpage_svc_floorplans
      import_initial_realpage_units
    else
      import_new_realpage_svc_floorplans
      import_new_initial_realpage_units
    end

    import_realpage_svc_units
    import_realpage_svc_price
  end

  # For Pynwheel Tour Package
  def import_realpage_svc_floorplans
    site_ids = credentials.site_id.split(',').map(&:strip) rescue []
    site_ids.each do |site_id|
      begin
        site_id = site_id&.strip
        community_id = credentials.community_id
        response = DataProviders::RealPage::V1ApisService.new(community_id).fetch_floorplans_data(site_id)
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          floorplans = result[:"s:Envelope"][1][:"s:Body"][1][:getfloorplanlistResponse][1][:getfloorplanlistResult][:GetFloorPlanList]
          floorplans.each do |fp|
            if fp.key?(:FloorPlanObject)
              fp = fp[:FloorPlanObject]
              provider_floorplan_id = "#{fp[:FloorPlanID]}-#{site_id.to_s}"
              floorplan = Floorplan.where(provider: "realpagesvc", community_id: community_id, provider_floorplan_id: provider_floorplan_id).first_or_initialize

              unless floorplan.name_is_updated.present? && floorplan.name_is_updated

                if fp[:FloorPlanName].present?
                  floorplan.name = fp[:FloorPlanName]
                elsif fp[:FloorPlanCode].present?
                  if fp[:FloorPlanCode] != fp[:FloorPlanName]
                    floorplan.name = fp[:FloorPlanCode] + " - " + fp[:FloorPlanName]
                  else
                    floorplan.name = fp[:FloorPlanCode] + " - " + fp[:FloorPlanNameMarketing]
                  end
                else
                  floorplan.name = fp[:FloorPlanNameMarketing]
                end
              end
              unless floorplan.bathroom_is_updated.present? && floorplan.bathroom_is_updated
                floorplan.bathrooms = fp[:Bathrooms]
              end

              unless floorplan.bedroom_is_updated.present? && floorplan.bedroom_is_updated
                floorplan.bedrooms = fp[:Bedrooms]
              end
              unless floorplan.square_feet_is_updated.present? && floorplan.square_feet_is_updated
                floorplan.square_feet = fp[:GrossSquareFootage]
              end
              unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated
                floorplan.market_rent = fp[:RentMin]
              end

              floorplan.save(:validate => false)

            end
          end
        end
      rescue => e
        raise e
      end
    end
  end

  # For Pynwheel Tour Package
  def import_initial_realpage_units
    site_ids = credentials.site_id.split(',').map(&:strip) rescue []
    site_ids.each do |site_id|
      begin
        @array_of_dates = [{ready_date: Date.today,units: []}]
        current_date = Date.today

        site_id = site_id&.strip
        community_id = credentials.community_id
        response = DataProviders::RealPage::V1ApisService.new(community_id).fetch_units_data(site_id)
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          units = result[:"s:Envelope"][1][:"s:Body"][1][:getunitsbypropertyResponse][1][:getunitsbypropertyResult][:GetUnitsByProperty]
          units.each do |u|

            if u.key?(:UnitObject)
              u = u[:UnitObject]
              hit = false
              provider_unit_id = "#{u[:UnitID]}-#{site_id.to_s}"
              unit = Unit.where(provider: "realpagesvc",community_id: community_id, provider_unit_id: provider_unit_id).first_or_initialize
              unless unit.manual_override
                unit.property_id = u[:SiteID]
                unit.provider_unit_id = provider_unit_id
                unit.unit_type = u[:UnitNumber]

                if u[:MadeReadyBit] == "true"
                  unit.unit_status = "Unoccupied"
                else
                  unit.unit_status = "Occupied"
                end

                if u[:BuildingNumber].present?
                  unit.building = u[:BuildingNumber] unless u[:BuildingNumber] == "N/A"
                end

                unless unit.name_is_updated.present? && unit.name_is_updated
                  unit.marketing_name = u[:UnitNumber]
                end

                unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
                  unit.floorplan_id = "#{u[:FloorplanID]}-#{site_id}"
                end

                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
                  unit.effective_rent = u[:BaseRentAmount].to_f > 0 ? u[:BaseRentAmount] : 1
                end

                unless unit.availability_is_updated.present? && unit.availability_is_updated && !(unit.manual_override)
                  unit.availability = u[:AvailableBit] == "true" ? "Unoccupied" : "Occupied"
                end
                if u[:RentSqFtCount].present?
                  unit.square_feet = u[:RentSqFtCount]
                end

                unless unit.floor_is_updated.present? && unit.floor_is_updated
                  unit.floor = u[:FloorNumber] rescue nil
                end

                unless unit.available_date_is_updated.present? && unit.available_date_is_updated
                  if u[:AvailableDate].present?
                    unit.available_date = u[:AvailableDate]
                  end

                  if u[:MadeReadyDate].present?
                    unit.available_date = u[:MadeReadyDate]
                  end
                  if unit.available_date.year == 1900
                    unit.available_date = ""
                  end
                  if unit.availability == "Occupied"
                    unit.available_date = ""
                  end
                end

                unless unit.available_is_updated.present? && unit.available_is_updated
                  if unit.availability == "Occupied"
                    unit.available = false
                  else
                    unit.available = true
                  end

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

                unit.manually_updated = false
                unit.save(validate: false)
              end
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
          cred.save
        rescue => err
        end
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end
  
  # For Pynwheel Touch and Map Package
  def import_new_realpage_svc_floorplans
    site_ids = credentials.site_id.split(',').map(&:strip) rescue []
    site_ids.each do |site_id|
      begin
        site_id = site_id&.strip
        community_id = credentials.community_id
        response = DataProviders::RealPage::V1ApisService.new(community_id).fetch_floorplans_data(site_id)
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          floorplans = result[:"s:Envelope"][1][:"s:Body"][1][:getfloorplansResponse][1][:getfloorplansResult][:FloorPlans]
          
          floorplans.each do |fp|
            if fp.key?(:FloorPlan)
              fp = fp[:FloorPlan]

              provider_floorplan_id = "#{fp[:FpID]}-#{site_id.to_s}"
              floorplan = Floorplan.where(provider: "realpagesvc", community_id: community_id, provider_floorplan_id: provider_floorplan_id).first_or_initialize

              unless floorplan.name_is_updated.present? && floorplan.name_is_updated
                if fp[:FpName].present?
                  floorplan.name = fp[:FpName]
                elsif fp[:Code].present?
                  if fp[:Code] != fp[:FpName]
                    floorplan.name = fp[:Code] + " - " + fp[:FpName]
                  else
                    floorplan.name = fp[:Code] + " - " + (fp[:FpNameMarketing] || "")
                  end
                else
                  floorplan.name = (fp[:FpNameMarketing] || "")
                end
              end

              unless floorplan.bathroom_is_updated.present? && floorplan.bathroom_is_updated
                floorplan.bathrooms = fp[:Bath]
              end

              unless floorplan.bedroom_is_updated.present? && floorplan.bedroom_is_updated
                floorplan.bedrooms = fp[:Bed]
              end

              unless floorplan.square_feet_is_updated.present? && floorplan.square_feet_is_updated
                floorplan.square_feet = fp[:GrossSqFt]
              end

              unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated
                floorplan.market_rent = fp[:FpMarketRent]
              end

              floorplan.save(:validate => false)

            end
          end
        end
      rescue => e
        raise e
      end
    end
  end

  # For Pynwheel Touch and Map Package
  def import_new_initial_realpage_units
    site_ids = credentials.site_id.split(',').map(&:strip) rescue []
    site_ids.each do |site_id|
      begin
        @array_of_dates = [{ready_date: Date.today,units: []}]
        current_date = Date.today

        site_id = site_id&.strip
        community_id = credentials.community_id
        response = DataProviders::RealPage::V1ApisService.new(community_id).fetch_units_data(site_id)
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          units = result[:"s:Envelope"][1][:"s:Body"][1][:unitlistResponse][1][:unitlistResult][:UnitList]
          
          units.each do |u|
            if u.key?(:Unit)
              u = u[:Unit]
              hit = false
              provider_unit_id = "#{u[:UnitID]}-#{site_id.to_s}"
              
              unit = Unit.where(provider: "realpagesvc",community_id: community_id, provider_unit_id: provider_unit_id).first_or_initialize

              unless unit.manual_override
                unit.property_id = site_id
                unit.provider_unit_id = provider_unit_id
                unit.unit_type = u[:UnitNumber]

                #It should be MadeReadyBit
                if u[:Vacant] == "T"
                  unit.unit_status = "Unoccupied"
                else
                  unit.unit_status = "Occupied"
                end

                if u[:BuildingNumber].present?
                  unit.building = u[:BuildingNumber] unless u[:BuildingNumber] == "N/A"
                end

                unless unit.name_is_updated.present? && unit.name_is_updated
                  unit.marketing_name = u[:UnitNumber]
                end

                unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
                  unit.floorplan_id = "#{u[:FloorplanID]}-#{site_id}"
                end

                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
                  unit.effective_rent = u[:MarketRent].to_f > 0 ? u[:MarketRent] : 1
                end

                unless unit.availability_is_updated.present? && unit.availability_is_updated && !(unit.manual_override)
                  unit.availability = u[:Available] == "T" ? "Unoccupied" : "Occupied"
                end

                if u[:RentableSqft].present?
                  unit.square_feet = u[:RentableSqft]
                end

                #TODO
                unless unit.floor_is_updated.present? && unit.floor_is_updated
                  unit.floor = u[:FloorNumber] rescue nil
                end

                unless unit.available_date_is_updated.present? && unit.available_date_is_updated
                  if u[:AvailableDate].present?
                    unit.available_date = u[:AvailableDate]
                  end

                  if u[:UnitMadeReadyDate].present?
                    unit.available_date = u[:UnitMadeReadyDate]
                  end

                  if unit.available_date.year == 1900
                    unit.available_date = ""
                  end

                  if unit.availability == "Occupied"
                    unit.available_date = ""
                  end
                end

                unless unit.available_is_updated.present? && unit.available_is_updated
                  if unit.availability == "Occupied"
                    unit.available = false
                  else
                    unit.available = true
                  end

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

                unit.manually_updated = false
                unit.save(validate: false)
              end
            end
          end
        end

      rescue => e
        raise e
      end
    end
  end

  def import_realpage_svc_units
    site_ids = credentials.site_id.split(',').map(&:strip) rescue []
    site_ids.each do |site_id|
      begin

        current_date = Date.today

        community_id = credentials.community_id
        @community = Community.find community_id

        if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
          url = RP_TOUR_API_URL
          license_key = ENV['RP_TOUR_API_KEY']
        else
          url = RP_TOUCH_API_URL
          license_key = ENV['RP_TOUCH_API_KEY']
        end

        soap_action = REALPAGE_PRICE_ACTION
        pmc_id = credentials.pmc_id
        site_id = site_id&.strip
        username = REALPAGESVC_USERNAME
        password = REALPAGESVC_PASSWORD
        date_needed = Date.today + 540

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
                                <tem:ListCriterion>
                                  <tem:name>IncludeRentMatrix</tem:name>
                                  <tem:singlevalue>0</tem:singlevalue>
                                </tem:ListCriterion>
                              </tem:listCriteria>
                              <tem:listCriteria>
                                <tem:name>LeaseTerms</tem:name>
                                <tem:singlevalue>12</tem:singlevalue>
                              </tem:listCriteria>
                            </tem:getunitlist>
                          </soapenv:Body>
                        </soapenv:Envelope>')
        sleep 1
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?
          units = result[:"s:Envelope"][1][:"s:Body"][1][:getunitlistResponse][1][:getunitlistResult][:GetUnitList][1][:UnitObjects][:UnitObject]
          units = [units] if units.is_a?(Hash)
          units.each do |u|
            provider_unit_id = "#{u[:Address][:UnitID]}-#{site_id.to_s}"
            unit = Unit.where(provider: "realpagesvc",community_id: community_id,provider_unit_id: provider_unit_id).first_or_initialize
            @array_of_units  << u[:Address][:UnitID] unless @array_of_units.include?(u[:Address][:UnitID])
            unless unit.manual_override
              unit.property_id = u[:SiteID]
              unit.unit_type = u[:Address][:UnitNumber]
              if u[:Address][:BuildingNumber].present?
                unit.building = u[:Address][:BuildingNumber] unless u[:Address][:BuildingNumber] == "N/A"
              end
              unless unit.name_is_updated.present? && unit.name_is_updated
                unit.marketing_name = u[:Address][:UnitNumber]
              end

              unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
                unit.floorplan_id = "#{u[:FloorPlan][:FloorPlanID]}-#{site_id}"
              end

              unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
                if u[:RentMatrix].present?
                  unit.effective_rent = u[:RentMatrix][1][:Rows][:Row][0][:MinRent].to_f > 0 ? u[:RentMatrix][1][:Rows][:Row][0][:MinRent] : 1
                else
                  unit.effective_rent = u[:BaseRentAmount]
                end
              end

              unless unit.availability_is_updated.present? && unit.availability_is_updated && !(unit.manual_override)
                unit.availability = u[:Availability][:AvailableBit] == "true" ? "Unoccupied" : "Occupied"
              end

              if u[:UnitDetails][:RentSqFtCount].present?
                unit.square_feet = u[:UnitDetails][:RentSqFtCount]
              end

              unless unit.floor_is_updated.present? && unit.floor_is_updated
                unit.floor = u[:UnitDetails][:FloorNumber] rescue nil
              end

              unless unit.available_date_is_updated.present? && unit.available_date_is_updated && !(unit.manual_override)
                if u[:Availability][:MadeReadyDate].present?
                  madeReadyDate = u[:Availability][:MadeReadyDate].split("/")[1] + "/" + u[:Availability][:MadeReadyDate].split("/")[0] + "/" + u[:Availability][:MadeReadyDate].split("/")[2]
                  unit.available_date = madeReadyDate
                elsif u[:Availability][:AvailableDate].present?
                  availableDate = u[:Availability][:AvailableDate].split("/")[1] + "/" + u[:Availability][:AvailableDate].split("/")[0] + "/" + u[:Availability][:AvailableDate].split("/")[2]
                  unit.available_date = availableDate
                end

                unless u[:Availability][:AvailableDate].present?
                  availableDate = u[:Availability][:VacantDate][3..4] + "/" + u[:Availability][:VacantDate][0..1] + "/" + u[:Availability][:VacantDate][5..9]
                  unit.available_date = availableDate
                end
              end

              unless unit.available_is_updated.present? && unit.available_is_updated
                if unit.availability == "Occupied"
                  unit.available = false
                else
                  unit.available = true
                end

              end

              unit_status_update(unit, u)

              unit.manually_updated = false

              unit.availability_url = "#{@apply_now_base_url}/apply_now?MoveInDate=#{Date.today.day}/#{Date.today.month}/#{Date.today.year}&UnitId=#{u[:Address][:UnitID]}&SearchUrl="


              unit.save(validate: false)
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
          cred.save
        rescue => err
        end
      end
    end
  end

  def import_realpage_svc_price
    site_ids = credentials.site_id.split(',').map(&:strip) rescue []
    units_str = ""
    @array_of_units.each do |us|
      units_str = units_str + "<tem:int>"+us+"</tem:int>"
    end
    site_ids.each do |site_id|
      begin
        community_id = credentials.community_id
        @community = Community.find community_id

        if @community.all_apps_enabled? || @community.pynwheel_tour_enabled?
          url = RP_TOUR_API_URL
          license_key = ENV['RP_TOUR_API_KEY']
        else
          url = RP_TOUCH_API_URL
          license_key = ENV['RP_TOUCH_API_KEY']
        end

        soap_action = 'http://tempuri.org/IRPXService/getrentmatrix'
        pmc_id = credentials.pmc_id
        site_id = site_id&.strip
        username = REALPAGESVC_USERNAME
        password = REALPAGESVC_PASSWORD

        date_check = Date.today

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
        result = Ox.load(response.body, mode: :hash)

        if result[:"s:Envelope"][1][:"s:Body"][1].present?

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
                end
              end

            rescue => ex
              unitHash = nil
            end

            if unit_min_rent.present?
              unit = Unit.where("provider = ? AND community_id = ? AND marketing_name =? AND building = ? AND provider_unit_id LIKE ?", "realpagesvc", community_id, unit_no, unit_add, "%-#{site_id}").last
            
              unless unit.present?
                unit = Unit.where("provider = ? AND community_id = ? AND marketing_name =? AND provider_unit_id LIKE ?", "realpagesvc", community_id, unit_no, "%-#{site_id}").last
              end

              if unit.present?
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated  && !(unit.manual_override)
                  unit.effective_rent = unit_min_rent
                end

                unit.min_effective_rent = unit_min_rent
                unit.max_effective_rent = unit_max_rent
                unit.lease_pricing = rentStr
                unit.save(:validate => false)
              end

              unit.min_effective_rent = unit_min_rent
              unit.max_effective_rent = unit_max_rent
              unit.lease_pricing = rentStr
              unit.save(:validate => false)
            end

          end
        end
      rescue => e
      end
    end
  end

  def unit_status_update unit, u
    if u[:Availability][:MadeReadyBit] == "true"
      unit.unit_status = "Unoccupied"
    else
      unit.unit_status = "Occupied"
    end
  end

  def get_availability_base_url community_id
    app_base_url = Rails.env.development? ? "localhost:3000" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com" : "https://pynwheelapp.com")
    "#{app_base_url}/communities/#{community_id}/webpages"
  end
end