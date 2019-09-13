class AddOrderToPathPoint < ActiveRecord::Migration[5.0]
  def change
    add_column :path_points, :order, :integer
    add_column :path_points, :reordered, :boolean, default: false
  end
end
