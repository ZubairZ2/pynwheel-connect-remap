class AddDoorUuidInLatchLocks < ActiveRecord::Migration[5.0]
  def change
    add_column :latch_locks, :door_uuid, :string
  end
end
