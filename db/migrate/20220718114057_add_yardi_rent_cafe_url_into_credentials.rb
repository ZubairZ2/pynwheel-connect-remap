class AddYardiRentCafeUrlIntoCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :yardi_rent_cafe_api_url, :string, default: "https://api.rentcafe.com"
  end
end
