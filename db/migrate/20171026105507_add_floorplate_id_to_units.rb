class AddFloorplateIdToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :floorplate_id, :integer
  end
end
