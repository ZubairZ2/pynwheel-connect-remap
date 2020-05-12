class RenameTypeToLockType < ActiveRecord::Migration[5.0]
  def change
    rename_column :remote_locks, :type, :remote_lock_type
  end
end
