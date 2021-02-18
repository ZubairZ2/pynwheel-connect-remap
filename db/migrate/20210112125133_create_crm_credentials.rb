class CreateCrmCredentials < ActiveRecord::Migration[5.0]
  def change
    create_table :crm_credentials do |t|
    t.string :crm_provider	
	  t.references :community, foreign_key: true

	  t.string :entrata_domain
	  t.string :entrata_username
	  t.string :entrata_password
	  t.string :entrata_property_id

	  t.string :realpage_site_id
	  t.string :realpage_pmc_id
	  
	  t.string :rentcafe_c_code
	  t.string :rentcafe_p_code
	  t.string :rentcafe_domain

	  t.string :salesforce_username
	  t.string :salesforce_password
	  t.string :salesforce_client_id
	  t.string :salesforce_secret_id
	  t.string :salesforce_grant_type

	  t.timestamps
    end
  end
end
