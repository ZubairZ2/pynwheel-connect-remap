class AddIgloohomeIglooworksApiKey < ActiveRecord::Migration[5.0]
  def change
    add_column :igloohomes, :iglooworks_api_key, :string, default: ""
  end
end
