class AddRentManagerCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :rentmanager_username, :string,  default: ""
    add_column :credentials, :rentmanager_password, :string,  default: ""
    add_column :credentials, :rentmanager_property_id, :string,  default: ""
  end
end
