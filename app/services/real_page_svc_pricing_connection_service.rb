class RealPageSvcPricingConnectionService < BaseService
  def perform
    site_ids = credentials.site_id.split(',') rescue []
    site_id = site_ids[0]
    begin
      url = REALPAGE_URL
      soap_action = REALPAGE_UNIT_ACTION
      pmc_id = credentials.pmc_id
      #site_id = credentials.site_id
      username = REALPAGESVC_USERNAME
      password = REALPAGESVC_PASSWORD
      license_key = REALPAGESVC_LICENSE_KEY
      community_id = credentials.community_id

      ###########################################################33

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

            if u[:MadeReadyDate].present?
              available_date = u[:MadeReadyDate]
            end

            if available_date.present?
              current_date = u[:UnitID]
            elsif available_date.present? && available_date < Date.today
              current_date = Date.today
            end

            @array_of_dates.each do |hash|
              if hash[:ready_date] == current_date
                hash[:units] << u[:UnitID]
                hit = true
              end
            end

            if !hit
              struct = {
                  ready_date: current_date,
                  units: u[:UnitID]
              }
              @array_of_dates << struct
            end
            #puts "++++++++++++++++++++++///////// ", unit.errors.message.join(',')

          end
        end
      end
      # #########################################################
      result2 = ""
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
        resul = Ox.load(response.body, mode: :hash)

        if resul[:"s:Envelope"][1][:"s:Body"][1].present?

          byebug
          # result2.merge **response.body
          puts '========' + response.body
          result2 = result2 + response.body
        end
      end
      byebug
      return  result2
    rescue => ex
      false
    end
  end
end