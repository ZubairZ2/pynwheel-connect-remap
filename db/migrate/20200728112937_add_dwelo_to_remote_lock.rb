class AddDweloToRemoteLock < ActiveRecord::Migration[5.0]
  def change
    add_reference :remote_locks, :dwelo, foreign_key: true
  end
end
