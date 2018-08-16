class AddManualOverrideFieldToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :manual_override, :boolean, default: false
  end
end
