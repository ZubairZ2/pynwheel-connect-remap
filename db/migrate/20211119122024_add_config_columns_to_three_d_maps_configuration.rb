class AddConfigColumnsToThreeDMapsConfiguration < ActiveRecord::Migration[5.0]
  def change
    add_column :three_d_maps_configurations, :faded_polygon_opacity, :float, default: 0.3
    add_column :three_d_maps_configurations, :show_unit_numbers, :boolean, default: true
    add_column :three_d_maps_configurations, :hide_floors, :boolean, default: true
  end
end