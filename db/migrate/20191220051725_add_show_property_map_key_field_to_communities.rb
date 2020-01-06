class AddShowPropertyMapKeyFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :show_property_map_key, :boolean, default: true
    add_column :communities, :show_property_map_key_text, :string, default: "Available Home"
    add_column :communities, :show_amenity_key, :boolean, default: true
    add_column :communities, :show_amenity_key_text, :string, default: "Amenity Image"
  end
end
