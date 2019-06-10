class AddXPlotFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :x_plot, :integer, default: 0
    add_column :tours, :y_plot, :integer, default: 0
  end
end
