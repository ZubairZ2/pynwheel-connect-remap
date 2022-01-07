class AddLeadsFieldsInCrmCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :crm_credentials, :yardirentcafe_leads_api_user_name, :string
    add_column :crm_credentials, :yardirentcafe_leads_api_password, :string
  end
end
