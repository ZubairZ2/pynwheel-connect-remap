class ChangeAmenityMapMarkerColor < ActiveRecord::Migration[5.0]
  def change
    change_column :designs, :amenity_map_marker_color, :string, :default => "#ff0000"
  end
end
