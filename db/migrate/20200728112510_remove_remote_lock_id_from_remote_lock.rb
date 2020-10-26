class RemoveRemoteLockIdFromRemoteLock < ActiveRecord::Migration[5.0]
  def change
    remove_column :remote_locks, :remote_lock_id, :integer
  end
end
