class AddPynwheelConnectAccessToUser < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :pynwheel_connect_access, :boolean, :default => true
  end
end
