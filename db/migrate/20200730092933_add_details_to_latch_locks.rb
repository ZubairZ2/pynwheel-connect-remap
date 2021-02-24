class AddDetailsToLatchLocks < ActiveRecord::Migration[5.0]
  def change
    add_column :latch_locks, :lock_name, :string
    rename_column :latch_locks, :key_id, :lock_id
  end
end
