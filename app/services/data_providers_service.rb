class DataProvidersService
  def initialize
    @communities = Community.active_client_properties
  end

  def update_providers_data
    @communities.each do |community|
      next if (community.locked.present? && community.locked)

      case community&.data_provider
      when "realpagesvc"
        RealPageDataUpdateWorker.perform_async community.id
      when "yardirentcafe"
        YardirentcafeDataUpdateWorker.perform_async community.id
      when "appfolio"
        AppFolioDataImportWorker.perform_async(community.id)
      when "beans"
        BeansDataImportWorker.perform_async(community.id)
      when "rentmanager"
        RentManagerDataImportWorker.perform_async community.id
      when "psi"
        EntrataDataUpdateWorker.perform_async community.id
      when "yardi"
        YardiDataUpdateWorker.perform_async community.id
      when "resman"
        ResmanDataUpdateWorker.perform_async community.id
      when "zaremba"
        ZarembaDataUpdateWorker.perform_async community.id
      when "xml"
        XmlDataUpdateWorker.perform_async community.id
      else
        next
      end

    end

  end

end