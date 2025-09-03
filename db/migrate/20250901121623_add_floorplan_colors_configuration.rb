class AddFloorplanColorsConfiguration < ActiveRecord::Migration[7.2]
  def change
    add_column :floorplans, :available_units_color, :string, default: '#00FF00', null: false
    add_column :floorplans, :available_units_opacity, :decimal, precision: 3, scale: 2, default: 1.0, null: false

    add_column :floorplans, :model_units_color, :string, default: '#FF0000', null: false
    add_column :floorplans, :model_units_opacity, :decimal, precision: 3, scale: 2, default: 1.0, null: false
  end
end
