class Add3DMapConfigurationsInCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :default_polygon_color, :string, default: '#3ca832'
    add_column :communities, :selected_polygon_color, :string, default: '#5ca904'
    add_column :communities, :default_polygon_opacity, :float, default: 0.5
    add_column :communities, :selected_polygon_opacity, :float, default: 0.8
    add_column :communities, :unit_color, :string, default: '#202'
    add_column :communities, :selected_unit_color, :string, default: '#5ca904'
    add_column :communities, :poi_color, :string, default: '#008000'
  end
end