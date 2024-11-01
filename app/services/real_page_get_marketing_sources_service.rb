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
          site_id = site_id&.strip
          response = DataProviders::RealPage::V1ApisService.new(@community.id).fetch_marketing_sources(site_id)
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
      @credential.update_columns(realpage_marketing_sources: marketing_sources)
    end

end
