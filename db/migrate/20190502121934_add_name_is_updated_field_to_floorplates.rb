class AddNameIsUpdatedFieldToFloorplates < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplates, :name_is_updated, :boolean
    add_column :floorplates, :building_is_updated, :boolean
    add_column :floorplates, :manual_override, :boolean, default: false
  end
end
