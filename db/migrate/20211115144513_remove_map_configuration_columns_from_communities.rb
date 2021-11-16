class RemoveMapConfigurationColumnsFromCommunities < ActiveRecord::Migration[5.0]
  def change
    remove_column :communities, :default_polygon_color, :string, default: "#3ca832"
    remove_column :communities, :selected_polygon_color, :string, default: "#5ca904"
    remove_column :communities, :default_polygon_opacity, :float, default: 0.5
    remove_column :communities, :selected_polygon_opacity, :float, default: 0.8
    remove_column :communities, :unit_color, :string, default: "#202"
    remove_column :communities, :selected_unit_color, :string, default: '#5ca904'
    remove_column :communities, :poi_color, :string, default: "#008000"
  end
end
