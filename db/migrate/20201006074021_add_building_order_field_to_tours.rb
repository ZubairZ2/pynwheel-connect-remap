class AddBuildingOrderFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :building_order, :text, array: true, default: []
  end
end
