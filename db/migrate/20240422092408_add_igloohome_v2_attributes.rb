class AddIgloohomeV2Attributes < ActiveRecord::Migration[5.0]
  def change
    add_column :igloohomes, :is_authorized_with_pynwheel, :boolean,  default: false
    add_column :igloohomes, :client_id, :string
    add_column :igloohomes, :client_secret, :string
    add_column :igloohomes, :refresh_token, :string
    add_column :igloohomes, :access_token, :string
    add_column :igloohomes, :access_token_expiry, :datetime
    add_column :igloohomes, :refresh_token_expiry, :datetime
    add_column :igloohomes, :version, :string, default: "v1"
  end
end
