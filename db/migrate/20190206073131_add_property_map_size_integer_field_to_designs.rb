class AddPropertyMapSizeIntegerFieldToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :property_map_size_integer, :integer, default: 30
    add_column :designs, :amenity_map_marker_size_integer, :integer, default: 30
  end
end
