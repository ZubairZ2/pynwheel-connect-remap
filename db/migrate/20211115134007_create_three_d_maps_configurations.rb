class CreateThreeDMapsConfigurations < ActiveRecord::Migration[5.0]
  def change
    create_table :three_d_maps_configurations do |t|
      t.string :default_polygon_color, default: '#3ca832'
      t.string :selected_polygon_color, default: '#5ca904'
      t.float :default_polygon_opacity, default: 0.5
      t.float :selected_polygon_opacity, default: 0.8
      t.string :unit_color, default: '#202'
      t.string :selected_unit_color, default: '#5ca904'
      t.string :poi_color, default: '#008000'
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
