class AddFieldNameIsUpdatedToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :name_is_updated, :boolean
    add_column :floorplans, :square_feet_is_updated, :boolean
    add_column :floorplans, :bedroom_is_updated, :boolean
    add_column :floorplans, :bathroom_is_updated, :boolean
  end
end
