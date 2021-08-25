class AddWebPageMapTypeIntoCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :web_map_type, :string,  default: "2d-map"
  end
end
