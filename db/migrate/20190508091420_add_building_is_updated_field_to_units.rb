class AddBuildingIsUpdatedFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :building_is_updated, :boolean
  end
end
