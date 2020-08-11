class RealPageGciService < BaseService
    def perform
        create_realpage_gci
    end

    def create_realpage_gci
        site_ids = credentials.site_id.split(',') rescue []
        site_ids.each do |site_id|
          begin
            url = REALPAGE_URL
            soap_action = REALPAGE_INSERT_PROSPECT
            pmc_id = credentials.pmc_id
            #site_id = credentials.site_id
            username = REALPAGESVC_USERNAME
            password = REALPAGESVC_PASSWORD
            license_key = REALPAGESVC_LICENSE_KEY
            community_id = credentials.community_id
            binding.pry
            response = HTTParty.post(
                url,
                :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
                :body => '<soapenv:Envelope
                xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                xmlns:tem="http://tempuri.org/">
                <soapenv:Header/>
                <soapenv:Body>
                    <tem:insertprospect>
                        <tem:auth>
                            <tem:pmcid>'+pmc_id+'</tem:pmcid>
                            <tem:siteid>'+site_id+'</tem:siteid>
                            <tem:username>'+username+'</tem:username>
                            <tem:password>'+password+'</tem:password>
                            <tem:licensekey>'+license_key+'</tem:licensekey>
                            <tem:system>OneSite</tem:system>
                        </tem:auth>
                        <tem:guestcard>
                            <tem:pmcid>'+pmc_id+'</tem:pmcid>
                            <tem:siteid>'+site_id+'</tem:siteid>
                            <tem:guestcardid>0</tem:guestcardid>
                            <tem:contacttype>R0000001</tem:contacttype>
                            <tem:datecontact>2014-02-21T00:00:00</tem:datecontact>
                            <tem:datefollowup>2014-02-24T00:00:00</tem:datefollowup>
                            <tem:createdate>2014-02-21T00:00:00</tem:createdate>
                            <tem:petweightrange>S000000001</tem:petweightrange>
                            <tem:prospectcomment>Test comment</tem:prospectcomment>
                            <tem:primaryleadsource>P000000001</tem:primaryleadsource>
                            <tem:secondaryleadsource>P000000001</tem:secondaryleadsource>
                            <tem:leasingagentid>0</tem:leasingagentid>
                            <tem:prospects>
                                <tem:Prospect>
                                    <tem:pmcid>'+pmc_id+'</tem:pmcid>
                                    <tem:siteid>'+site_id+'</tem:siteid>
                                    <tem:customerid>0</tem:customerid>
                                    <tem:firstname>Neil</tem:firstname>
                                    <tem:middlename>O</tem:middlename>
                                    <tem:lastname>Orozco</tem:lastname>
                                    <tem:email>EO@gmail.com</tem:email>
                                    <tem:relationshipid>H</tem:relationshipid>
                                    <tem:address>
                                        <tem:line1>123 Metro</tem:line1>
                                        <tem:line2>Metrodorm</tem:line2>
                                        <tem:city>Pasig</tem:city>
                                        <tem:state>TX</tem:state>
                                        <tem:zip>12345</tem:zip>
                                        <tem:country>PH</tem:country>
                                        <tem:ExtensionData/>
                                    </tem:address>
                                    <tem:numbers>
                                        <tem:phonenumbers>
                                            <tem:PhoneNumber>
                                                <tem:type>Home</tem:type>
                                                <tem:number>10000</tem:number>
                                                <tem:extension>1</tem:extension>
                                                <tem:ExtensionData/>
                                            </tem:PhoneNumber>
                                        </tem:phonenumbers>
                                        <tem:ExtensionData/>
                                    </tem:numbers>
                                    <tem:gender>F</tem:gender>
                                    <tem:idnumber>040506201</tem:idnumber>
                                    <tem:ssn>123456789</tem:ssn>
                                    <tem:prefcommunicationtype>PHONE</tem:prefcommunicationtype>
                                    <tem:ExtensionData/>
                                </tem:Prospect>
                            </tem:prospects>
                            <tem:ExtensionData/>
                        </tem:guestcard>
                    </tem:insertprospect>
                </soapenv:Body>
            </soapenv:Envelope>')
            binding.pry
            # sleep 1
            # result = Ox.load(response.body, mode: :hash)
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
end