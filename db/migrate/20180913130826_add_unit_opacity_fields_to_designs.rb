class AddUnitOpacityFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :unit_header_bg_color_opacity, :string
    add_column :designs, :unit_details_bg_color_opacity , :string
    add_column :designs, :floorplan_name_bg_color_opacity, :string
    add_column :designs, :unit_bg_color_opacity, :string
  end
end
