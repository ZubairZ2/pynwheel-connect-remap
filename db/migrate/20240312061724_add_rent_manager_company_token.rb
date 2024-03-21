class AddRentManagerCompanyToken < ActiveRecord::Migration[5.0]
  def change
    add_column :companies, :rentmanager_auth_token, :string
    add_column :companies, :rentmanager_token_expiry, :datetime
    add_column :companies, :rentmanager_token_inactivity, :datetime
  end
end
