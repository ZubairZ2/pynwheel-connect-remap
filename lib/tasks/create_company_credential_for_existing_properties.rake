
  desc 'create company credentials for existing properties'
  task :create_company_credential => :environment do

  companies = Company.joins(communities: :credential)

  all_communities = []

  companies.each do |company|
    company_communities = []

    communities = company.communities.group_by(&:data_provider)

    communities.each do |data_provider, community_group|
      next unless %w(psi resman realpagesvc yardirentcafe yardi).include?(data_provider)

      credential_attribute =
        case data_provider
        when 'psi'
          %i[entrata_url username password currency]
        when 'resman'
          %i[resman_api_version resman_account_id currency]
        when 'realpagesvc'
          %i[pmc_id currency]
        when "yardirentcafe"
          %i[rentcafe_api_version yardi_rent_cafe_api_url api_token c_code  currency]
        when "yardi"
          %i[url  username password database currency server_name interface_entity platform]
        else
          []
        end

      next if credential_attribute.empty?

      common_credential_values = community_group
                                   .map { |community| community.credential&.slice(*credential_attribute)&.values }
                                   .compact
                                   .tally
                                   .max_by(&:last)&.first

      community_info = {
        "company_id" => company.id,
        "data_provider" => data_provider,
        "common_credential_values" => common_credential_values,
      }

      company_communities << community_info
    end

    all_communities.concat(company_communities)
  end

  all_communities.uniq.each do |community_info|
    company_id = community_info["company_id"]
    data_provider = community_info["data_provider"]
    credential = community_info["common_credential_values"]
    company = Company.find(company_id)
    unless company.data_providers.include?(data_provider)
      create_company_credential_for_provider(company, data_provider,credential)
    end
  end

  end

  def create_company_credential_for_provider(company, data_provider, credential)
    credential_attributes = case data_provider
                            when "psi"
                              { entrata_url: credential[0], username: credential[1], password: credential[2], currency: credential[3] }
                            when "yardirentcafe"
                              {rentcafe_api_version: credential[0], yardi_rent_cafe_api_url: credential[1], api_token: credential[2], c_code: credential[3], currency: credential[4] }
                            when "realpagesvc"
                              { pmc_id: credential[0], currency: credential[1] }
                            when "yardi"
                              { url: credential[0], username: credential[1], password: credential[2], database: credential[3] , currency: credential[4], server_name: credential[5], interface_entity: credential[6], platform: credential[7] }
                            when "resman"
                              { resman_api_version: credential[0], resman_account_id: credential[1], currency: credential[2] }
                            else
                              {}
                            end

    if company.credential.present? ?  company.credential.update(credential_attributes)  : company.create_credential(credential_attributes)
      company.data_providers << data_provider
      company.save
      puts company
    end
  end