class CreateIgloohomeLocks < ActiveRecord::Migration[5.0]
  def change
    create_table :igloohome_locks do |t|
      t.string :device_name
      t.string :device_id
      t.references :stop, polymorphic: true
      t.references :igloohome, foreign_key: true

      t.timestamps
    end
  end
end