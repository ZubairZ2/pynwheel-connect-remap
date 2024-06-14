class CrmCredential < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable

  def crm_provider_credentials
    crm_credential_provider = self.crm_provider
    case crm_credential_provider
      when "psi"
		    psi_crm_credentials
      when "yardirentcafe"
		    yardirentcafe_crm_credentials
      when "realpagesvc"
		    realpagesvc_crm_credentials
      when "salesforce"
		    salesforce_crm_credentials
      when "knock"
		    knock_crm_credentials
      when "funnel"
		    funnel_crm_credentials
    end
  end

  def psi_crm_credentials
	  {entrata_domain: self.entrata_domain, entrata_username: self.entrata_username, entrata_password: self.entrata_password, entrata_property_id: self.entrata_property_id}
  end

  def yardirentcafe_crm_credentials
	  { 
      yardirentcafe_marketing_api_key: self.yardirentcafe_marketing_api_key,
      yardirentcafe_property_id: self.yardirentcafe_property_id, 
      yardirentcafe_property_code: self.yardirentcafe_property_code
    }
  end
  
  def realpagesvc_crm_credentials
	  {realpage_site_id: self.realpage_site_id, realpage_pmc_id: self.realpage_pmc_id}
  end

  def salesforce_crm_credentials
	  { 
      salesforce_username: self.salesforce_username, salesforce_password: self.salesforce_password, salesforce_client_id: self.salesforce_client_id,
      salesforce_secret_id: self.salesforce_secret_id, salesforce_property_id: self.salesforce_property_id
    }
  end

  def knock_crm_credentials
	  {knock_community_id: self.knock_community_id, knock_company_id: self.knock_company_id}
  end

  def funnel_crm_credentials
	  {funnel_api_key: self.funnel_api_key, funnel_community_id: self.funnel_community_id}
  end

  def credential_present?
  	if self.entrata_domain.present? || realpage_site_id.present? || salesforce_username.present? || funnel_api_key.present? || knock_community_id.present? || yardirentcafe_marketing_api_key.present? || crm_provider.present?
  		(true)
  	else
  		(false)
  	end
  end
end
