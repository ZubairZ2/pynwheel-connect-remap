class CreateLatchLocks < ActiveRecord::Migration[5.0]
  def change
    create_table :latch_locks do |t|
      t.string :key_id
      t.references :stop, polymorphic: true
      t.references :latch, foreign_key: true

      t.timestamps
    end
  end
end
