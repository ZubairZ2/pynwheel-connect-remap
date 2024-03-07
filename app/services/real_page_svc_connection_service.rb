class RealPageSvcConnectionService < BaseService
  def perform
    site_ids = credentials.site_id.split(',') rescue []
    site_id = site_ids[0]
    begin
      url = REALPAGE_URL
      soap_action = REALPAGE_UNIT_ACTION
      pmc_id = credentials.pmc_id
      site_id = credentials.site_id
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
                          <tem:getunitsbyproperty>
                            <tem:auth>
                              <tem:pmcid>'+pmc_id+'</tem:pmcid>
                              <tem:siteid>'+site_id+'</tem:siteid>
                              <tem:username>'+username+'</tem:username>
                              <tem:password>'+password+'</tem:password>
                              <tem:licensekey>'+license_key+'</tem:licensekey>
                            </tem:auth>
                          </tem:getunitsbyproperty>
                        </soapenv:Body>
                      </soapenv:Envelope>
          ')
      return response.body
    rescue
      false
    end
  end
end