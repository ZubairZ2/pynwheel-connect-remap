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
    end
  end

  def psi_crm_credentials
	  {domain: self.entrata_domain, username: self.entrata_username, password: self.entrata_password, property_id: self.entrata_property_id}
  end

  def yardirentcafe_crm_credentials
	  {username: self.yardirentcafe_leads_api_user_name, password: self.yardirentcafe_leads_api_password, marketing_api_key: self.yardirentcafe_marketing_api_key, company_code: yardirentcafe_company_code, property_id: self.yardirentcafe_property_id, property_code: self.yardirentcafe_property_code}
  end
  
  def realpagesvc_crm_credentials
	  {site_id: self.realpage_site_id, pmc_id: self.realpage_pmc_id}
  end

  def salesforce_crm_credentials
	  {username: self.salesforce_username, password: self.salesforce_password, client_id: self.salesforce_client_id, client_secret: self.salesforce_secret_id, property_id: self.salesforce_property_id}
  end

  def knock_crm_credentials
	  {api_key: self.knock_api_key, community_id: self.knock_community_id, sms_content_url: self.knock_sms_consent_url}
  end

  def credential_present?
  	if self.entrata_domain.present? || realpage_site_id.present? || salesforce_username.present?
  		(true)
  	else
  		(false)
  	end
  end
end
