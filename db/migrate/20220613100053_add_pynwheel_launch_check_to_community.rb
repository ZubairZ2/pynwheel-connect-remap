class AddPynwheelLaunchCheckToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :pynwheel_launch_access, :boolean, :default => false
  end
end
