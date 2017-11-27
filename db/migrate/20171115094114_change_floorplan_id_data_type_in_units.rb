class ChangeFloorplanIdDataTypeInUnits < ActiveRecord::Migration[5.0]
  def change
  	change_column :units, :floorplan_id, :string
  end
end
