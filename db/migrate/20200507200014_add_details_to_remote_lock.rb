class AddDetailsToRemoteLock < ActiveRecord::Migration[5.0]
  def change
    remove_column :remote_locks, :unit_id, :integer
    remove_column :remote_locks, :unit_name, :string
    remove_column :remote_locks, :amenity_id, :integer
    remove_column :remote_locks, :amenity_name, :string
    add_column :remote_locks, :stop_id, :integer
    add_column :remote_locks, :stop_type, :string
    add_column :remote_locks, :stop_name, :string
  end
end
