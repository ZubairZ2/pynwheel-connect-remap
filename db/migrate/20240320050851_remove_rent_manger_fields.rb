class RemoveRentMangerFields < ActiveRecord::Migration[5.0]
  def change
    remove_column :companies, :rentmanager_token_expiry
    remove_column :companies, :rentmanager_token_inactivity
    remove_column :companies, :rentmanager_auth_token
  end
end
