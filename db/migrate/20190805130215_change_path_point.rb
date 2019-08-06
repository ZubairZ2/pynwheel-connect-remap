class ChangePathPoint < ActiveRecord::Migration[5.0]
  def change
  	rename_column :path_points, :x, :x_plot
  	rename_column :path_points, :y, :y_plot

  	remove_reference(:path_points, :floorplate, index: true)
  	add_reference :path_points, :path, index: true
  end
end
