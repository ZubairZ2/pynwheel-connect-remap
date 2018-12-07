class AddColumnsXPlotToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :x_plot, :integer, :default => 0
    add_column :units, :y_plot, :integer, :default => 0
  end
end
