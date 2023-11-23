
  desc 'create company credentials for existing properties'
  task :create_company_credential => :environment do
    providers = ["psi", "yardirentcafe", "realpagesvc", "yardi", "resman"]
    communities = Community.joins(:credential).where(data_provider: providers)

    communities.each do |community|
      company = Company.find(community.company_id)
      next unless company

      unless company.data_providers.include?(community.data_provider)
        company.data_providers << community.data_provider
        create_company_credential_for_provider(company, community) if community.credential.present?
        company.save
      end
    end
  end

  def create_company_credential_for_provider(company, community)
    credential_attributes = case community.data_provider
                            when "psi"
                              { entrata_url: community.credential&.entrata_url, username: community.credential&.username, password: community.credential&.password, currency: community.credential&.currency }
                            when "yardirentcafe"
                              {rentcafe_api_version: community.credential&.rentcafe_api_version, yardi_rent_cafe_api_url: community.credential&.yardi_rent_cafe_api_url, currency: community.credential&.currency, api_token: community.credential&.api_token, c_code: community.credential&.c_code }
                            when "realpagesvc"
                              { pmc_id: community.credential.pmc_id, currency: community.credential.currency }
                            when "yardi"
                              { url: community.credential&.url, username: community.credential&.username, password: community.credential&.password, currency: community.credential&.currency, server_name: community.credential&.server_name, database: community.credential&.database, platform: community.credential&.platform, interface_entity: community.credential&.interface_entity }
                            when "resman"
                              { resman_api_version: community.credential&.resman_api_version, resman_account_id: community.credential&.resman_account_id, currency: community.credential&.currency }
                            else
                              {}
                            end

    company.create_credential(credential_attributes)
    puts company
  end
