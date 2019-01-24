class AddAmenityMapMarkerSizeFieldToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :amenity_map_marker_size, :string, default: '30px'
    add_column :designs, :amenity_map_marker_color, :string, default: '#d37474'
  end
end
