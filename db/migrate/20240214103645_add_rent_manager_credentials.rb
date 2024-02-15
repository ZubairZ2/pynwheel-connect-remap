class AddRentManagerCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :rentmanager_username, :string,  default: ""
    add_column :credentials, :rentmanager_password, :string,  default: ""
  end
end
