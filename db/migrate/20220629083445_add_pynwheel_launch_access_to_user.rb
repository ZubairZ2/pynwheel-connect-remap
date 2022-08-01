class AddPynwheelLaunchAccessToUser < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :pynwheel_launch_access, :boolean, :default => false
  end
end
