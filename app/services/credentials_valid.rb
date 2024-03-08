class CredentialsValid < BaseService
  def perform
    community = Community.find credentials.community_id

    if community.data_provider == "psi"
      begin
        if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
          url = credentials.entrata_url
        else
          url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end
        password = credentials.password
        username = credentials.username
        property_id = credentials.property_id.split(',')[0]

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
                                             "availableUnitsOnly": credentials&.entrata_available_units_only,
                                             "showUnitSpaces": credentials&.entrata_show_unit_spaces
                                         }
                                     }
                                 }.to_json,
                                 :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)

        if response["response"]["code"] == 200
          return true
        else
           return false
        end
      rescue  => ex
        return false
      end
    elsif community.data_provider == "realpagesvc"
      begin
        url = REALPAGE_URL
        soap_action = REALPAGE_FLOORPLAN_ACTION
        pmc_id = credentials.pmc_id
        site_id = credentials.site_id.split(',')[0]
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
          return true
        else
          return false
        end
      rescue => e
        return false
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    elsif community.data_provider == "resman"
      begin
        account_id = credentials.resman_account_id
        property_id = credentials.resman_property_id.split(',')[0]
        url = "#{ENV["RESMAN_BASE_URL"]}/GetMarketing2_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey": ENV["RESMAN_API_KEY"],
                                     "IntegrationPartnerID": ENV["RESMAN_PARTNER_ID"],
                                     "AccountID": account_id,
                                     "PropertyID": property_id,
                                 },
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )
        # response =  JSON.parse(response.body)
        if response["ResMan"]["Status"] == "Success"
          return true
        else
          return false
        end
      rescue => e
        return false
      end
    elsif community.data_provider == "xml"
      begin
        filename = credentials.xml_filename
        domain = credentials.xml_domain.split(',')[0]
        url = "http://pynwheel.com/swoop/datafeeds/tgm/"
        url = url  + filename + ".xml"


        response = HTTParty.get(url)
        result = ""
        if response['PhysicalProperty']['Property'].class == Array
          response['PhysicalProperty']['Property'].each do |p|
            if p['PropertyID']['Identification']['SecondaryID'].present?
              if p['PropertyID']['Identification']['SecondaryID'] == domain
                result = p
              end
            end
          end
        else
          p = response['PhysicalProperty']['Property']

          if p['PropertyID']['Identification']['SecondaryID'] == domain
            result = p
          end
        end
        if result.present?
          return true
        else
          return false
        end
      rescue => e
        return false
      end
    elsif community.data_provider == "yardi"
      if credentials.url[credentials.url.length-10..credentials.url.length-1].include?("20")
        begin
          url = credentials.url
          arr = url.split('/')
          post = "#{arr[3]}/Webservices/itfilsguestcard20.asmx HTTP/1.1"
          host = arr[2]
          soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20/UnitAvailability_Login'
          user_name = credentials.username
          password = credentials.password
          server_name = credentials.server_name
          database = credentials.database
          platform = credentials.platform
          property_id = credentials.property_id.split(',')[0]
          interface_entity = credentials.interface_entity
          license_key = YARDI_LICENSE_KEY
          response = HTTParty.post(
              url,
              :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
              :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
          #result = Hash.from_xml(response.body) This method consumes a lot of memory on heroku
          result = Ox.load(response.body, mode: :hash)
          if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty].present?
            return true
          else
            return false
          end
        rescue => e
          return false
        end
      else
        return true
        begin

          url = credentials.url
          arr = url.split('/')
          post = "/#{arr[3]}/Webservices/itfilsguestcard.asmx HTTP/1.1"
          host = arr[2]
          soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'
          user_name = credentials.username
          password = credentials.password
          server_name = credentials.server_name
          database = credentials.database
          platform = credentials.platform
          property_id = credentials.property_id.split(',')[0]
          interface_entity = credentials.interface_entity
          license_key = YARDI_LICENSE_KEY


          response = HTTParty.post(
              url,
              :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
              :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')


          result = Ox.load(response.body, mode: :hash)
          if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty].present?
            return true
          else
            return false
          end
        rescue => e
          return false
        end

      end
    elsif community.data_provider == "yardirentcafe"
      verify_rent_cafe_credentials(community, credentials)

    elsif community.data_provider == "rentmanager"
      verify_rent_manager_credentials(community, credentials)

    elsif community.data_provider == "zaremba"
      begin
        property_id = credentials.zaremba_property_id.split(',')[0] rescue []
        username = credentials.zaremba_username
        password = credentials.zaremba_password
        filename = credentials.zaremba_filename
        url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
        url = url + "?" + "filename=" + filename + ".xml" + "&" + "username=" + username + "&" + "password=" + password

        result = ""
        response = HTTParty.get(url)
        if response['PhysicalProperty']['Property'].class == Array
          response['PhysicalProperty']['Property'].each do |p|

            if p['IDValue'].present?
              if p['IDValue'] == property_id
                result = p
              end
            end
          end
        else
          p = response['PhysicalProperty']['Property']

          if p['IDValue'] == property_id
            result = p
          else
            return false
          end
        end
        if result.present?
          return true
        else
          return false
        end
      rescue => e
       return false
      end

    else
      return true
    end

  end

  private

    def verify_rent_manager_credentials community, credentials
      begin
        property_code = credentials&.rentmanager_property_id&.split(",")[0] rescue ""
        property_code = property_code&.strip
        rent_manager_service = DataProviders::RentManager::BaseService.new(community.id)
        response = rent_manager_service.get_property_details(property_code)
        
        return response.success?
      rescue => e
        return false
      end

    end

    def verify_rent_cafe_credentials community, credentials
      if credentials.rentcafe_api_version == "RentCafe V2"
        verify_rentcafe_v2_credentials(community, credentials)
      else
        verify_rentcafe_v1_credentials(community, credentials)
      end
    end

    def verify_rentcafe_v1_credentials community, credentials
      begin
        request_type = "apartmentavailability"
        company_code = credentials.c_code
        api_token = credentials.api_token
        property_code = credentials.p_code.split(',')[0]
        showallunit =  credentials.limit_result ? "0" : "-1"

        if api_token.present?
          @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=#{showallunit}"
        else
          @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=#{showallunit}"
        end
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)

        if response[0]["Error"].nil?
          return true
        else
          return false
        end
      rescue => e
        return false
      end
    end

    def verify_rentcafe_v2_credentials community, credentials
      begin
        property_code = credentials&.p_code&.split(",")[0] rescue ""
        property_code = property_code&.strip
        response = DataProviders::RentCafe::V2ApisService.new(community&.id).get_apartment_availability(property_code)

        return response.present? ? true : false
      rescue => e
        return false
      end
    end

end