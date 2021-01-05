class CreateZervLocks < ActiveRecord::Migration[5.0]
  def change
    create_table :zerv_locks do |t|
      t.string :mac_id
      t.boolean :is_device_active
      t.string :location_name
      t.string :location_friendly_name
      t.string :sub_location_name
      t.string :sub_location_friendly_name
      t.string :universal_access_code
      t.references :zerv, foreign_key: true
      t.references :stop, polymorphic: true

      t.timestamps
    end
  end
end
