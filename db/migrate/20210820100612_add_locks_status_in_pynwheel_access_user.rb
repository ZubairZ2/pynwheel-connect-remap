class AddLocksStatusInPynwheelAccessUser < ActiveRecord::Migration[5.0]
  def change
    add_column :pynwheel_access_users, :dwelo_status, :string
    add_column :pynwheel_access_users, :edge_state_status, :string
    add_column :pynwheel_access_users, :latch_status, :string
    add_column :pynwheel_access_users, :zerv_status, :string
  end
end
