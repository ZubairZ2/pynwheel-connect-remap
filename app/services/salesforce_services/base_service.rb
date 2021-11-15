module SalesforceServices
  class BaseService
    def self.call(*args, &block)
      new(args[0][:community]).execute(args[0])
    end

    def initialize(community)
      @sales_force = (community.use_crm_credentials? && community.crm_credential.crm_provider == "salesforce") ? community.crm_credential : nil
    end
    
    def get_access_token
      generate_access_token 
    end

    def generate_access_token
      SalesforceServices::AuthToken.call(community: @sales_force.community)
    end

    def base_url
      Rails.env.production? ? "#{ENV["SALESFORCE_PRODUCTION_URL"]}/services/apexrest" : "#{ENV["SALESFORCE_UAT_URL"]}/services/apexrest"
    end
  end
end