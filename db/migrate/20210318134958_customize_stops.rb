class CustomizeStops < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :stops_list, :integer, array: true, default: []
  end

  def down
    remove_column :schedual_tours, :stops_list, :integer, array: true, default: []
  end
end
