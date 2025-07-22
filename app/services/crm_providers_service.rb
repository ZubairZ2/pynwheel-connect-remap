class CrmProvidersService

  def initialize
    @communities = Community.active_client_properties
  end

  def update_crm_providers_data
    @communities.each do |community|
      if community.use_yardi_as_lead?
        RentCafeCrmWorker.perform_async community.id
      elsif community.is_knock_community?
        KnockCrmWorker.perform_async community.id
      elsif community.is_funnel_community?
        FunnelCrmWorker.perform_async community.id
      end
    end
  end
end