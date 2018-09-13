class AddFloorplanOpacityFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :header_bg_color_opacity, :string
    add_column :designs, :details_bg_color_opacity, :string
    add_column :designs, :available_appartments_bg_color_opacity, :string
    add_column :designs, :floor_bg_color_opacity, :string
  end
end
