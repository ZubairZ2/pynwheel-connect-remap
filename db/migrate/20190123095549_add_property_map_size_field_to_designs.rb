class AddPropertyMapSizeFieldToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :property_map_size, :string, default: '30px'
    add_column :designs, :property_map_color, :string, default: '#d37474'
  end
end
