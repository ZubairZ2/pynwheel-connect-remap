class Api::V1::CommunitiesController < ActionController::Base
  #before_action :set_community, only: [:data,:ios_data,:email_favorites]
  before_action :set_community, only: :email_favorites
  @@counter = 0

  def test_panzoom
    puts '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'
    puts params["keyCode"]
    puts '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'
    render :json=> {:success=>true, :message => "#{params['id']}", :operation => "zoom"}
  end

  def login
    begin
      str = params[:community_string]
      community = Community.where(code: str)
      unless community.present?
        community_group = CommunityGroup.where(code: str)
      end
      if community_group.present?

        community_group = community_group.first

        if community_group.inactivate == false
          render :json=> {:success=>true, :community => community_group.id,:name => community_group.name,:community_name => (Company.find community_group.company_id).name,:type => "community_group",:link => "/api/v1/communities/#{community_group.id}/data_group.json",:is_group => true , :message => "success", :operation => "login"}
        else
          render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
        end
      else
        if community.present?
          company = community.first.company
          group = CommunityGroup.find_by id: community.first.community_group_id if community.first.community_group_id.present?
          if company.inactivate == false && !(community.first.locked == true)
            group_link = group.present? ? "/api/v1/communities/#{group.id}/data_group.json" : nil
            render :json=> {:success=>true, :community => community.first.id,:name => community.first.name,:community_name => company.name,:type => "community",:link =>  group.present? ? group_link : "/api/v1/communities/#{community.first.id}/data.json",:is_group => group.present?, :message => "success", :operation => "login"}
          else
            render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
          end
        else
          render :json=> {:success=>false, :message => "Invalid code"}
        end
      end

    rescue Exception => e   
      render :json=> {:success=>false, :message => e.message}, :status=>500
    end
  end

  def data
    include_application_data
  end

  def ios_data
    include_application_data
    if !(@community.locked == true) && @community.company.inactivate == false
      render 'data'
    else
      render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
    end
  end

  def minimum_data
    include_application_data
    render json: {:ui_settigs=>UiPresenter.minimal_hash(@community),:homescreen=>HomescreenPresenter.minimal_hash(@community),:apartments=>ApartmentsPresenter.minimal_hash(@community,params[:action]),:neighborhood=>NeighborhoodPresenter.minimal_hash(@community),:favorite=>FavoritePresenter.minimal_hash(@community),:gallery=>GalleryPresenter.minimal_hash(@community,params[:action]),:additional_pages=>AdditionalPagesPresenter.minimal_hash(@community)}.to_json
    #render json: {:ui_settigs=>UiPresenter.minimal_hash(@community),:homescreen=>HomescreenPresenter.minimal_hash(@community),:apartments=>ApartmentsPresenter.minimal_hash(@community,params[:action]),:neighborhood=>NeighborhoodPresenter.minimal_hash(@community),:favorite=>FavoritePresenter.minimal_hash(@community),:additional_pages=>AdditionalPagesPresenter.minimal_hash(@community)}
  end

  def email_favorites
    begin
      if !@community.favorite_setting.present? || @community.favorite_setting.email_from.blank?
        render :json=> {:success=>false, :message => "Please specify sender email address in CMS first. Email from can't be empty.", :operation => "email favorites"}
      else
        if @community.email_favorites(params)
          render :json=> {:success=>true, :message => "success", :operation => "email favorites"}
        else
          render :json=> {:success=>false, :message => "No valid favorites present"}
        end
      end
    rescue Exception => e   
      ExceptionNotifier.notify_exception(e,data: {community_id: @community.id})
      render :json=> {:success=>false, :message => e.message}, :status=>500
    end
  end
  
  def update_version
    app_version = AppVersion.first
    if app_version.version != params[:version]
      app_version.update_attribute(:version,params[:version])
    end
    render :json=> {:success=>true, :message => "success", :operation => "update version"}
  end

  def list_communities
    @communities = Community.select(:id,:name,:company_id,:locked,:latitude,:longitude,:address,:logo).includes(:company)
  end
  def portico_list_communities
    @communities = Community.select(:id,:name,:company_id,:locked,:latitude,:longitude,:address,:logo).includes(:company).self_tour_enabled_only
  end
  def community_tours
    @community = Community.find params[:id]
    @tours = Tour.where(community_id: params[:id])
  end
  def user_saved_tour
    @device_id = params[:device_id]
    @tour_user = TourUser.find params[:id]
    @tours = VisitedStop.where(tour_user_id: @tour_user.id,device_id: @device_id).group('tour_id').group('tour_key').count
  end
  def include_application_data
    @version = AppVersion.first.version
    @community = Community.includes(:imagepages,:webpages,:galleries,{floorplans: [:amenities]},:favorite_setting,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]},{gallery_images: [:gallery]},{neighborhood: [:locations]},{design: [:home_page_images,:home_page_video,:gable,:menu,:expressionist,:filter_panel]}).find(params[:id])
  end
  def update_unit_floorplan_data
    community = Community.find(params[:id])
    if community.data_provider == "psi"
      result = ImportPsiDataJob.perform_async community.credential.attributes.to_json
    elsif community.data_provider == "yardirentcafe"
      result = ImportYardirentcafeDataJob.perform_async community.credential.attributes.to_json
    elsif community.data_provider == "yardi"
      result = community.credential.url.include?("20") ? ImportYardi2DataJob.perform_async(community.credential.attributes.to_json) : ImportYardi4DataJob.perform_async(community.credential.attributes.to_json)
    elsif community.data_provider == "resman"
      result = ImportResmanDataJob.perform_async community.credential.attributes.to_json
    elsif community.data_provider == "zaremba"
      result = ImportZarembaDataJob.perform_async community.credential.attributes.to_json
    elsif community.data_provider == "xml"
      result = ImportXmlDataJob.perform_async community.credential.attributes.to_json
    elsif community.data_provider == "realpagesvc"
      result = ImportRealpageSvcDataJob.perform_async community.credential.attributes.to_json
    end
    render :json=> {:success=>result, :message => "success", :operation => "update data"}
  end
  def data_group
    @version = AppVersion.first.version
    @community_group = CommunityGroup.find params[:id]
    @communities = []

    @community_group.communities.each do |com|
      community = Community.includes(:imagepages,:webpages,:galleries,{floorplans: [:amenities]},:favorite_setting,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]},{gallery_images: [:gallery]},{neighborhood: [:locations]},{design: [:home_page_images,:home_page_video,:gable,:menu,:expressionist,:filter_panel]}).find(com.id)
      @communities << community unless community.locked
    end
  end
  def get_neighbourhood_data
    # @@counter = @@counter + 1
    if params[:token] == "pynwheeltoken12345"
    app_version = AppVersion.first
    unless app_version.neighborhood_counter.present?
      app_version.neighborhood_counter = 0
    end
    app_version.neighborhood_counter = app_version.neighborhood_counter + 1
    result = nil
    if app_version.neighborhood_counter < app_version.counter_limit
      NeighbourhoodLog.create(from_ip: request.ip,cat: params[:cat])
      begin
        if app_version.neighborhood_counter == 20
          com = Community.find params[:id]
          com.neighbourhood_counter_mail_200
          NeighbourhoodMailer.email_counter_200("muhammad.umer@intagleo.com","umersani47@gmail.com","","Testing api calls 200").deliver
        end
        if app_version.neighborhood_counter == 20
          com = Community.find params[:id]
          com.neighbourhood_counter_mail_400
          NeighbourhoodMailer.email_counter_400("test@gmail.com","umersani47@gmail.com","","Testing api calls 200").deliver
        end
      rescue => ex

      end
      @url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{params[:cat]}&location=#{params[:latitude]},#{params[:longitude]}&radius=#{params[:radius]}&key=AIzaSyCOUsWrubjWjFSmsTs68dJT7u9ah7hDGMI"
      response = HTTParty.get(@url)
      # @client = GooglePlaces::Client.new()
      results = []
      # cata = []
      # cata << params[:cat]
      # result = @client.spots(params[:latitude].to_f, params[:longitude].to_f,:radius => params[:radius].to_i, :types => cata)

      if response['next_page_token'].present? && (params[:cat] == "restaurant" || params[:cat] == "school" || params[:cat] == "park" || params[:cat] == "bank" || params[:cat] == "atm" )
        results << response
        begin
          @url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{params[:cat]}&location=#{params[:latitude]},#{params[:longitude]}&radius=#{params[:radius]}&key=AIzaSyCOUsWrubjWjFSmsTs68dJT7u9ah7hDGMI&pagetoken=#{response['next_page_token']}"
          sleep 1
          response = HTTParty.get(@url)
        rescue  => ex
        end
      end
      results = []
      results << response
      render :json=> {:success=>true,:counter => app_version.neighborhood_counter, :message => ""}, :status=>200
    else
      render :json=> {:success=>true,:counter => app_version.neighborhood_counter, :message => "Limit Exceeded"}, :status=>200
    end
    app_version.save
    else
      render :json=> {:success=>false, :message => "You are not allowd to make this call."}, :status=>200
    end
  end
  def reset_counter
    # @@counter = 0
    app_version = AppVersion.first
    app_version.neighborhood_counter = 0
    app_version.save
    render :json=> {:success=>true,:counter => app_version.neighborhood_counter}, :status=>200
  end

  def unit_and_floorplan_data
    @community = Community.find params[:id]
    @units = {}
    @floorplans = []
    perform(@community , @community.credential)

  end

  def perform(community , credentials)
    @community = community
    @credentials = credentials
    property_ids = @credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        @@floorplanHash = {}
        if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
          url = @credentials.entrata_url
        else
          url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end


        password = @credentials.password
        username = @credentials.username
        #property_id = credentials.property_id

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
        response =  JSON.parse(response.body)
        # if com_test.id == 458
        #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "3 "
        #   com_test.save
        # end
        sleep 2
        if response["response"]["code"] == 200
          units = []
          floorplans = []
          response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
            pro["ILS_Unit"].each do |ils|
              units << ils
            end
            pro["Floorplan"].each do |f|
              floorplans << f
            end
          end


          save_psi_floorplans(floorplans,property_id)

          save_psi_units(units,property_id,@credentials)

          # save_website_column_of_community(response)
          #else
          #puts '-----------------------------' , response["response"]["error"]["message"]
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        else

        end
      rescue => e

        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
    begin
    rescue => ex
    end
    fill_psi_pricing_details
    @units = @units.values
  end

  def save_psi_units(units,property_id,credentials)
    units.each do |u|
      vacateDate = ""
      # unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])#.first_or_initialize
      # unless unit.present?
      #   unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"])#.first_or_initialize
      # end
      unit = Unit.new
      if unit.present?
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"]
        unit.community_id = credentials.community_id
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]

        unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
        if u["Units"]["Unit"]["MarketRent"].present?
          unit.market_rent = u["Units"]["Unit"]["MarketRent"]
        end
        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          if u["Units"]["Unit"]["MarketRent"].present?
            unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
          elsif u["EffectiveRent"].present?
            unit.effective_rent = u["EffectiveRent"]
            # else
              unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
          end
        end

        unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
        if u["EffectiveRent"].present?
          unit.effective_rent = u["EffectiveRent"]
        else
          unit.effective_rent = 0
        end
        unit.floor = u["FloorLevel"]
        unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
          unit.availability = u["Availability"]["VacancyClass"] if !unit.sold
          unit.available = false if !unit.sold
        end

        if u["Availability"]["VacancyClass"] == "Unoccupied"
          unit.available = true if !unit.sold
          year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
          month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
          day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        end
        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacateDate
        end
        unit.availability_url = u['UnitAvailabilityURL'] if u['UnitAvailabilityURL'].present?
        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        @units[unit.provider_unit_id] = unit
        # unit.save(validate: false)






      end
    end
  end
  def fill_psi_pricing_details
    floorplanHash = Hash.new
    property_ids = @credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      move_in_dates = getMoveInDate(property_id)
      unless move_in_dates.present?
        move_in_dates = []
        move_in_dates << "0"
      end
      ########################################## Space configuration
      move_in_dates.each do |move_in_date|
        begin
          if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
            url = @credentials.entrata_url
          else
            url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
          end
          password = @credentials.password
          username = @credentials.username
          #property_id = credentials.property_id
          if move_in_date == "0"
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
                                                 "availableUnitsOnly": "0",
                                                 "showUnitSpaces": "1",
                                                 "useSpaceConfiguration": "1"
                                             }
                                         }
                                     }.to_json,
                                     :headers => { 'Content-Type' => 'application/json' } )
            response =  JSON.parse(response.body)
          else
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
                                                 "availableUnitsOnly": "0",
                                                 "showUnitSpaces": "1",
                                                 "useSpaceConfiguration": "1",
                                                 "moveInStartDate": move_in_date
                                             }
                                         }
                                     }.to_json,
                                     :headers => { 'Content-Type' => 'application/json' } )
            response =  JSON.parse(response.body)
          end
          sleep 3

          if response["response"]["code"] == 200
            unless response["response"]["result"].include?('No records found')
              psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
              psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
              psi_floorplan.each_with_index do |f,index|
                floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
              end
              psi_units.each do |u|
                u['UnitSpace'].each do |us|

                  begin
                    if u['UnitSpace'].count == 1
                      # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                      unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s]
                      unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                        unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]]
                        # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)],community_id: credentials.community_id)
                      end
                    else
                      unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                      # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                      unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                        unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                        # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                      end
                    end
                    unless unit.present?
                      unit = @units[ u["@attributes"]["Id"]]
                      # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"],community_id: credentials.community_id)
                    end
                    unless unit.present? # for unit with have extra 'A' in unit number getavailabilityandpricing
                      unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                      # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                    end

                    if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                      unit.availability = 'Unoccupied' if !unit.sold
                      unit.available = true if !unit.sold
                    else
                      unit.availability = 'Occupied'
                      unit.available = false
                    end

                    if us[1]["@attributes"]["AvailableOn"].present?
                      date = us[1]["@attributes"]["AvailableOn"]
                      dateSplit = date.split('/')
                      day = dateSplit[0]
                      month = dateSplit[1]
                      year = dateSplit[2]
                      unit.available_date = Date.parse("#{month}-#{day}-#{year}")
                    end
                    if (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).present? && (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_i > 0
                      unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                    elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                      unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                    else
                      unit.effective_rent = 0.0
                    end
                    rentStr = ""
                    begin
                      if us[1]["Rent"]["TermRent"].count > 1# && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                        us[1]["Rent"]["TermRent"].each do |tr|
                          spaceOption = tr["@attributes"]["SpaceOption"].present? ? tr["@attributes"]["SpaceOption"] : "" rescue ""
                          startDate = tr["@attributes"]["StartDate"].present? ? tr["@attributes"]["StartDate"] : "" rescue ""
                          endDate = tr["@attributes"]["EndDate"].present? ? tr["@attributes"]["EndDate"] : "" rescue ""
                          rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +":"+spaceOption+":"+startDate+":"+endDate+";"
                        end
                      end
                    rescue => rt_ex

                    end

                    unit.lease_pricing = rentStr
                    @units.index(unit)
                    @units[unit.provider_unit_id] = unit
                      # unit.save(validate: false)
                  rescue => ex
                    puts "---------------- Space configuration inside loop", ex.message
                  end
                end
              end
              puts "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"* 300
              #else
              #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
            else
              #################################### with unit space pricing
              begin
                if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
                  url = @credentials.entrata_url
                else
                  url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
                end
                password = @credentials.password
                username = @credentials.username
                #property_id = credentials.property_id
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
                                                     "availableUnitsOnly": "0",
                                                     "showUnitSpaces": "1"
                                                 }
                                             }
                                         }.to_json,
                                         :headers => { 'Content-Type' => 'application/json' } )
                response =  JSON.parse(response.body)
                sleep 3
                if response["response"]["code"] == 200
                  psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
                  psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
                  psi_floorplan.each_with_index do |f,index|
                    floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
                  end
                  psi_units.each do |u|
                    u['UnitSpace'].each do |us|
                      begin
                        if u['UnitSpace'].count == 1
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s]
                          unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                            unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]]
                            # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)],community_id: credentials.community_id)
                          end
                        else
                          unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                            unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                            # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          end
                        end
                        unless unit.present?
                          unit = @units[ u["@attributes"]["Id"]]
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"],community_id: credentials.community_id)
                        end
                        unless unit.present? # for unit with have extra 'A' in unit number getavailabilityandpricing
                          unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                        end

                        if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                          unit.availability = 'Unoccupied' if !unit.sold
                          unit.available = true if !unit.sold
                        else
                          unit.availability = 'Occupied'
                          unit.available = false
                        end
                        if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                          unit.availability = 'Unoccupied' if !unit.sold
                          unit.available = true if !unit.sold
                        else
                          unit.availability = 'Occupied'
                          unit.available = false
                        end

                        if us[1]["@attributes"]["AvailableOn"].present?
                          date = us[1]["@attributes"]["AvailableOn"]
                          dateSplit = date.split('/')
                          day = dateSplit[0]
                          month = dateSplit[1]
                          year = dateSplit[2]
                          unit.available_date = Date.parse("#{month}-#{day}-#{year}")
                        end
                        if (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).present? && (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_i > 0
                          unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                        elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                          unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                        else
                          unit.effective_rent = 0.0
                        end
                        rentStr = ""
                        begin
                          if us[1]["Rent"]["TermRent"].count > 1 #0 && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                            us[1]["Rent"]["TermRent"].each do |tr|
                              rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +"::;"
                            end
                          end
                        rescue => rt_ex

                        end

                        unit.lease_pricing = rentStr

                        @units[unit.provider_unit_id] = unit
                          # unit.save(validate: false)
                      rescue => ex
                        puts "---------------- filling pricing inside loop", ex.message
                      end
                    end
                  end
                  #else
                  #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
                end
              rescue => e

                puts '-------------- filling pricing --------------' , e.message
                #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
              end

              ####################################
            end

          end
        rescue => e
          # begin
          #   com = Community.find credentials.community_id
          #   unless com.entrata_exception_logs.present?
          #     com.entrata_exception_logs = ""
          #   end
          #   com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||Pricing|||||||| " + com.id.to_s + "--- "+ e.message
          #   com.save
          # rescue => r
          # end
          puts '-------------- filling pricing --------------' , e.message
          #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
        end
      end

      ##########################################


    end
  end
  def save_psi_floorplans(floorplans,property_id)

    floorplans.each do |f|
      floorplan = Floorplan.new
      # floorplan = Floorplan.find_by(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"])#.first_or_initialize
      if floorplan.present?
        floorplan.property_id = property_id
        floorplan.name = f["Name"]
        floorplan.unit_count = f["UnitsAvailable"]
        floorplan.units_available = f["DisplayedUnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
        floorplan.availability_url = f["FloorplanAvailabilityURL"] if f["FloorplanAvailabilityURL"].present?


        room_types = f["Room"]
        room_types.each do |rt|
          if rt["@attributes"]["RoomType"] == "Bedroom"
            floorplan.bedrooms = rt["Count"]
          else
            floorplan.bathrooms = rt["Count"]
          end
        end

        if f["SquareFeet"]["@attributes"]["Min"].to_f > 0

          floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
        else


          floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
        end
        if f["MarketRent"]["@attributes"]["Min"].to_f > 0
          @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Min"]
        else
          @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Max"]
        end
        if f["MarketRent"]["@attributes"]["Min"].to_f > 0

          floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
        else

          floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
        end
      end
      @floorplans << floorplan
      # floorplan.save(validate: false)

    end
  end


  def getMoveInDate(property_id)
    url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/properties"
    password = @credentials.password
    username = @credentials.username
    #property_id = credentials.property_id
    begin
      response = HTTParty.post(url,
                               :body => {
                                   "auth": {
                                       "type": "basic",
                                       "password": password,
                                       "username": username
                                   },
                                   "requestId": 15,
                                   "method": {
                                       "name": "getPropertyPickLists",
                                       "version":"r1",
                                       "params": {
                                           "propertyIds": property_id
                                       }
                                   }
                               }.to_json,
                               :headers => { 'Content-Type' => 'application/json' } )
      response =  JSON.parse(response.body)
      moveIn_dates = []
      response['response']['result']['Property'][0]['leasePeriods']['leasePeriod'].each do |dates|
        if dates['leaseStartDate'].present?
          moveIn_dates << dates['leaseStartDate']
        end
      end
    rescue
    end
    moveIn_dates
  end

  private

  def set_community
    @community = Community.find(params[:id])
  end
end