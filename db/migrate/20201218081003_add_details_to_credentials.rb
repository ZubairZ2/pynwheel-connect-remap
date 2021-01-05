class AddDetailsToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :crm_provider, :string
    add_column :credentials, :crm_username, :string
    add_column :credentials, :crm_password, :string
    add_column :credentials, :crm_client_id, :string
    add_column :credentials, :crm_client_secret, :string
  end
end
