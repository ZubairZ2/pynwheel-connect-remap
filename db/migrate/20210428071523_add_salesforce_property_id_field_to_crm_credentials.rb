class AddSalesforcePropertyIdFieldToCrmCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :crm_credentials, :salesforce_property_id, :string
  end
end
