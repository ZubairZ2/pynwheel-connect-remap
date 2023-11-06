class AddRentCafeAuthAttributesIntoCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :rentcafe_v2_auth_token, :string
    add_column :credentials, :rentcafe_v2_token_expires_at, :datetime
  end
end
