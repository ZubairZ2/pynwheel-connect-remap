class CrmCredential < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable

  def credential_present?
  	if self.entrata_domain.present? || realpage_site_id.present? || salesforce_username.present?
  		(true)
  	else
  		(false)
  	end
  end
end
