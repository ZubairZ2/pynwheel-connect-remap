class AddDweloIdToRemoteLock < ActiveRecord::Migration[5.0]
  def change
    add_reference :remote_locks, :remote_lock, foreign_key: true
  end
end
