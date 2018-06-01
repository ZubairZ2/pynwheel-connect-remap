class AddColumnShowHideToNeighborhoods < ActiveRecord::Migration[5.0]
  def change
    add_column :neighborhoods, :show_neighborhood, :boolean, default: true
    add_column :neighborhoods, :neighborhood_name, :string, default: "Neighborhood"
  end
end
