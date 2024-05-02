class AddRentMangerTokenAndUrlIntoCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :rentmanager_auth_token, :string, default: ""
    add_column :credentials, :rentmanager_base_url, :string, default: ""
  end
end
