class AddNextpointsToHallways < ActiveRecord::Migration[5.0]
  def change
    add_column :hallways, :next_points, :int, array: true, default: []
  end
end
