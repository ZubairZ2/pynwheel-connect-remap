class AddResmanApikeyFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :resman_apikey, :string
    add_column :credentials, :resman_partner_id, :string
    add_column :credentials, :resman_account_id, :string
    add_column :credentials, :resman_property_id, :string
  end
end
