class AddApiUrlFieldToDwelos < ActiveRecord::Migration[5.0]
  def change
    add_column :dwelos, :api_url, :string, default: "https://api.dwelo.com"
  end
end
