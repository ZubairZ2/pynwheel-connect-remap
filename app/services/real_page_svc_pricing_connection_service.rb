class RealPageSvcPricingConnectionService < BaseService
  def perform
    site_ids = credentials.site_id.split(',') rescue []
    site_id = site_ids[0]
    @array_of_units = []

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
                              </tem:listCriteria>
                              <tem:listCriteria>
                                <tem:name>LeaseTerms</tem:name>
                                <tem:singlevalue>12</tem:singlevalue>
                              </tem:listCriteria>
                            </tem:getunitlist>
                          </soapenv:Body>
                        </soapenv:Envelope>')

    result = Ox.load(response.body, mode: :hash)
    if result[:"s:Envelope"][1][:"s:Body"][1].present?
      units = result[:"s:Envelope"][1][:"s:Body"][1][:getunitlistResponse][1][:getunitlistResult][:GetUnitList][1][:UnitObjects][:UnitObject]
      units = [units] if units.is_a?(Hash)
      units.each do |u|
        @array_of_units << u[:Address][:UnitID]
      end
    end
    units_str = ""
    @array_of_units.each do |us|
      units_str = units_str + "<tem:int>"+us+"</tem:int>"
    end

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
  
      soap_action = REALPAGE_MATRIX_ACTION
      pmc_id = credentials.pmc_id
      site_id = credentials.site_id.split(",")[0]
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
        #result = Hash.from_xml(response.body) This method consumes too much memory on heroku
    rescue => e
    end

    ########################

    return response.body
  end




end