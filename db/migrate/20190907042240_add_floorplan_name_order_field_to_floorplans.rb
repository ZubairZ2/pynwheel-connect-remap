class AddFloorplanNameOrderFieldToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :floorplan_name_order, :boolean, default: false
  end
end
