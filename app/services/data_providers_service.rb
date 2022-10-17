class DataProvidersService
  def initialize provider
    @communities = Community.where.not(data_provider: nil, company_id: 44)
    @communities = @communities.where(data_provider: provider, locked: false)
  end

  def sync_psi_data
    return unless @communities.present?
    @communities.each do |community|
      ImportPsiDataJob.perform_async(community.credential.attributes.to_json)
    end
  end

  def sync_resman_data
    return unless @communities.present?
    @communities.each do |community|
      ((community.credential.resman_api_version === "GetMarketing4_0") ? ImportResman4DataJob.perform_async(community.credential.attributes.to_json) : ImportResmanDataJob.perform_async(community.credential.attributes.to_json))
    end
  end

  def sync_yardi_data
    return unless @communities.present?
    @communities.each do |community|
      community.credential.url.include?("20") ? ImportYardi2DataJob.perform_async(community.credential.attributes.to_json) : ImportYardi4DataJob.perform_async(community.credential.attributes.to_json)
    end
  end

  def sync_yardirentcafe_data
    return unless @communities.present?
    @communities.each do |community|
      ImportYardirentcafeDataJob.perform_async community.credential.attributes.to_json
    end
  end
  
  def sync_realpagesvc_data
    return unless @communities.present?
    @communities.each do |community|
      ImportRealpageSvcDataJob.perform_async community.credential.attributes.to_json
    end
  end

  def sync_spreadsheet_data
    return unless @communities.present?
    # Nothing
  end

  def sync_zaremba_data
    return unless @communities.present?
    @communities.each do |community|
      ImportZarembaDataJob.perform_async community.credential.attributes.to_json
    end
  end

  def sync_xml_data
    return unless @communities.present?
    @communities.each do |community|
      ImportXmlDataJob.perform_async community.credential.attributes.to_json
    end
  end


end