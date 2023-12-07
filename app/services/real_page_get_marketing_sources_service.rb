class RealPageGetMarketingSourcesService < BaseService

  def initialize(community_id)
    @community = Community.find(community_id)
    @credential = @community.credential
    @crm_credential = @community.crm_credential
    return unless (@community.present? || @credential.present? )
  end

  def perform
    get_marketing_sources_by_property
  end

  private

    def get_marketing_sources_by_property
      site_ids = site_ids_for_community
      site_ids.each do |site_id|
        begin
          response = fetch_marketing_sources(site_id)
          process_marketing_sources(response)
        rescue => e
          handle_error
        end
      end
    end

    def site_ids_for_community
      @community.use_crm_credentials? ? @crm_credential.realpage_site_id.split(',') : @credential.site_id.split(',')
    rescue
      []
    end

    def fetch_marketing_sources(site_id)
      pmc_id = @community.use_crm_credentials? ? @crm_credential.realpage_pmc_id : @credential.pmc_id
      body = generate_soap_request(pmc_id, site_id)
      send_soap_request(body)
    end

    def generate_soap_request(pmc_id, site_id)
      <<~XML
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                           xmlns:tem="http://tempuri.org/">
          <soapenv:Header/>
          <soapenv:Body>
            <tem:getmarketingsourcesbyproperty>
              <tem:auth>
                <tem:pmcid>#{pmc_id}</tem:pmcid>
                <tem:siteid>#{site_id}</tem:siteid>
                <tem:username>#{REALPAGESVC_USERNAME}</tem:username>
                <tem:password>#{REALPAGESVC_PASSWORD}</tem:password>
                <tem:licensekey>#{REALPAGESVC_LICENSE_KEY}</tem:licensekey>
                <tem:system>OneSite</tem:system>
              </tem:auth>
            </tem:getmarketingsourcesbyproperty>
          </soapenv:Body>
        </soapenv:Envelope>
      XML
    end

    def send_soap_request(body)
      HTTParty.post(
        REALPAGE_URL,
        headers: {
          "Content-Type" => "text/xml",
          "Content-Length" => body.length.to_s,
          "Accept" => "text/xml",
          "Cache-Control" => "no-cache",
          "Pragma" => "no-cache",
          "SOAPAction" => REALPAGE_MARKETING_SOURCES_ACTION
        },
        body: body
      )
    end

    def process_marketing_sources(response)
      result = Ox.load(response.body, mode: :hash)
      marketing_sources = result[:"s:Envelope"][1][:"s:Body"][1][:getmarketingsourcesbypropertyResponse][1][:getmarketingsourcesbypropertyResult][:GetMarketingSourcesByProperty][1][:Contents][:PicklistItem]
      update_credential(marketing_sources)
    end

    def handle_error
      @credential.data_error_message = "Get Marketing Sources from #{@credential.community.data_provider} is not available. Please contact #{@credential.community.data_provider} for more information or email support@pynwheel.com."
      PaperTrail.enabled = false
      @credential.save
      PaperTrail.enabled = true
    end

    def update_credential(marketing_sources)
      @credential.update_attributes(realpage_marketing_sources: marketing_sources)
    end

end
