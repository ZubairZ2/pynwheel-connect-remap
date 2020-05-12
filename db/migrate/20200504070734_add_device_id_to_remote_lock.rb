class AddDeviceIdToRemoteLock < ActiveRecord::Migration[5.0]
  def change
    add_column :remote_locks, :device_id, :string
  end
end
