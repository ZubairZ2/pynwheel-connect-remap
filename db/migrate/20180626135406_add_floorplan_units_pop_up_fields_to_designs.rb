class AddFloorplanUnitsPopUpFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :header_bg_color, :string
    add_column :designs, :header_font_color, :string
    add_column :designs, :details_bg_color, :string
    add_column :designs, :details_font_color, :string
    add_column :designs, :available_appartments_font_color, :string
    add_column :designs, :available_appartments_bg_color, :string
    add_column :designs, :floor_bg_color, :string
    add_column :designs, :unit_header_bg_color, :string
    add_column :designs, :unit_header_font_color, :string
    add_column :designs, :unit_details_font_color, :string
    add_column :designs, :unit_details_bg_color, :string
    add_column :designs, :floorplan_name_bg_color, :string
    add_column :designs, :floorplan_name_font_color, :string
    add_column :designs, :unit_bg_color, :string
  end
end
