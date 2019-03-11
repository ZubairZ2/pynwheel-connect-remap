class AddFuturistMapMarkerColorFieldToDesign < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :futurist_property_map_marker_color, :string
    add_column :designs, :expressionist_property_map_marker_color, :string
    add_column :designs, :panther_property_map_marker_color, :string

    add_column :designs, :futurist_amenity_map_marker_color, :string
    add_column :designs, :expressionist__amenity_map_marker_color, :string
    add_column :designs, :panther_amenity_map_marker_color, :string

    add_column :designs, :futurist_property_map_size, :integer
    add_column :designs, :expressionist_property_map_size, :integer
    add_column :designs, :panther_property_map_size, :integer
    add_column :designs, :modernist_property_map_size, :integer

    add_column :designs, :futurist_amenity_map_size, :integer
    add_column :designs, :expressionist_amenity_map_size, :integer
    add_column :designs, :panther_amenity_map_size, :integer
    add_column :designs, :modernist_amenity_map_size, :integer


    add_column :designs, :futurist_unit_floorplan_map_marker_color, :string
    add_column :designs, :expressionist_unit_floorplan_map_marker_color, :string
    add_column :designs, :panther_unit_floorplan_map_marker_color, :string
    add_column :designs, :gables_unit_floorplan_map_marker_color, :string
    add_column :designs, :modernist_unit_floorplan_map_marker_color, :string
  end
end
