class AddLatchOptionLaunch < ActiveRecord::Migration[5.0]
  def change
    add_column :latches, :is_building_name_added, :boolean,  default: false
    add_column :latches, :is_integration_submitted, :boolean,  default: false
    add_column :latches, :is_mission_control_setup, :boolean,  default: false
  end
end
