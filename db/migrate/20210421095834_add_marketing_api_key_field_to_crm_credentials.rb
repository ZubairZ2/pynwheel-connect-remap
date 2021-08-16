class AddMarketingApiKeyFieldToCrmCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :crm_credentials, :yardirentcafe_marketing_api_key, :string
    add_column :crm_credentials, :yardirentcafe_company_code, :string
    add_column :crm_credentials, :yardirentcafe_property_id, :string
    add_column :crm_credentials, :yardirentcafe_property_code, :string

    add_column :schedual_tours, :yardirentcafe_prospect_id, :string
    add_column :schedual_tours, :yardirentcafe_appointment_id, :string
    add_column :schedual_tours, :yardirentcafe_leads_attribution, :string
  end
end