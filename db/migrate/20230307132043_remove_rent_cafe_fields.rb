class RemoveRentCafeFields < ActiveRecord::Migration[5.0]
  def up
    remove_column :crm_credentials, :yardirentcafe_company_code, if_exists: true
    remove_column :crm_credentials, :yardirentcafe_leads_api_user_name, if_exists: true
    remove_column :crm_credentials, :yardirentcafe_leads_api_password, if_exists: true
  end

  def down
    add_column :crm_credentials, :yardirentcafe_company_code, :string, if_exists: false
    add_column :crm_credentials, :yardirentcafe_leads_api_user_name, :string, if_exists: false
    add_column :crm_credentials, :yardirentcafe_leads_api_password, :string, if_exists: false
  end
end
