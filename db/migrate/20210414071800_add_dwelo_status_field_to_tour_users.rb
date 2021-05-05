class AddDweloStatusFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :dwelo_status, :string
    add_column :tour_users, :edge_state_status, :string
    add_column :tour_users, :latch_status, :string
    add_column :tour_users, :zerv_status, :string
  end
end
