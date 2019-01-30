class AddModernistAmenityMapMarkerColorFieldToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :modernists_amenity_map_marker_color, :string, default: 'no color'
  end
end
