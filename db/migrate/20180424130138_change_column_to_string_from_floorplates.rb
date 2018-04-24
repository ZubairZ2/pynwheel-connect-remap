class ChangeColumnToStringFromFloorplates < ActiveRecord::Migration[5.0]
  def change
  	change_column :floorplates, :range, :string
  end
end
