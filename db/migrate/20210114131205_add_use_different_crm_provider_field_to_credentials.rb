class AddUseDifferentCrmProviderFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :use_different_crm_provider, :boolean, default: false
  end
end
