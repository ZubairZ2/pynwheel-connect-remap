class RealPageSvcConnectionService < BaseService
	def perform
    puts "%%%%%%%%3"*500
    site_ids = credentials.site_id.split(',') rescue []
    site_id = site_ids[0]
    begin
      puts "%%%%%%%%4"*500
	    url = REALPAGE_URL
      soap_action = REALPAGE_PRICE_ACTION
      pmc_id = credentials.pmc_id
      #site_id = credentials.site_id
      username = REALPAGESVC_USERNAME
      password = REALPAGESVC_PASSWORD
      license_key = REALPAGESVC_LICENSE_KEY
      date_needed = Date.today
      community_id = credentials.community_id
      puts "%%%%%%%%5"*500
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
      puts "%%%%%%%%9"*1000
      puts response
      return response.body
    rescue
      false
    end
	end
end