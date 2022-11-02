class DataProvidersService
  def initialize provider
    # remove pynwheel Inc and Prometheous company
    @communities = Community.where.not(data_provider: nil, company_id: [44, 423])
    @communities = @communities.where(data_provider: provider, locked: false)
    @communities = @communities.where.not(data_provider_updated_on: "Never").order(:data_provider_updated_on) + @communities.where(data_provider_updated_on: "Never")
  end

  def sync_psi_data
    return unless @communities.present?
    @communities.each do |community|
      puts "\n\n --------- Started updating for community: #{community.id}, Last updated on:  #{community.data_provider_updated_on.to_s} ------------- \n\n"
      ImportPsiDataJob.perform_async(community.credential.attributes.to_json)
      sleep ENV["SLEEP_TIME"].to_i
    end
  end

  def sync_resman_data
    return unless @communities.present?
    @communities.each do |community|
      puts "\n\n --------- Started updating for community: #{community.id}, Last updated on:  #{community.data_provider_updated_on.to_s} ------------- \n\n"
      ((community.credential.resman_api_version === "GetMarketing4_0") ? ImportResman4DataJob.perform_async(community.credential.attributes.to_json) : ImportResmanDataJob.perform_async(community.credential.attributes.to_json))
      sleep ENV["SLEEP_TIME"].to_i
    end
  end

  def sync_yardi_data
    return unless @communities.present?
    @communities.each do |community|
      puts "\n\n --------- Started updating for community: #{community.id}, Last updated on:  #{community.data_provider_updated_on.to_s} ------------- \n\n"
      community.credential.url.include?("20") ? ImportYardi2DataJob.perform_async(community.credential.attributes.to_json) : ImportYardi4DataJob.perform_async(community.credential.attributes.to_json)
      sleep ENV["SLEEP_TIME"].to_i
    end
  end

  def sync_yardirentcafe_data
    return unless @communities.present?
    @communities.each do |community|
      puts "\n\n --------- Started updating for community: #{community.id}, Last updated on:  #{community.data_provider_updated_on.to_s} ------------- \n\n"
      ImportYardirentcafeDataJob.perform_async community.credential.attributes.to_json
      sleep ENV["SLEEP_TIME"].to_i

    end
  end
  
  def sync_realpagesvc_data
    return unless @communities.present?
    @communities.each do |community|
      puts "\n\n --------- Started updating for community: #{community.id}, Last updated on:  #{community.data_provider_updated_on.to_s} ------------- \n\n"
      ImportRealpageSvcDataJob.perform_async community.credential.attributes.to_json
      sleep ENV["SLEEP_TIME"].to_i
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