class DataProvidersService
  def initialize provider
    @communities = Community.where.not(data_provider: nil, company_id: 44)
    @communities = @communities.where(data_provider: provider, locked: false)
  end

  def sync_psi_data
    return unless @communities.present?
    @communities.each do |community|
      ImportPsiDataJob.perform_in(120, community.credential.attributes.to_json)
    end
  end

  def sync_resman_data
    return unless @communities.present?


  end

  def sync_yardi_data
    return unless @communities.present?

    
  end

  def sync_yardirentcafe_data
    return unless @communities.present?


  end
  
  def sync_realpagesvc_data
    return unless @communities.present?


  end

  def sync_spreadsheet_data
    return unless @communities.present?


  end

  def sync_zaremba_data
    return unless @communities.present?


  end

  def sync_xml_data
    return unless @communities.present?
    
  end


end