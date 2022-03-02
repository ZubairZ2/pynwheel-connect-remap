class CreateAccessLogs < ActiveRecord::Migration[5.0]
  def change
    create_table :access_logs do |t|
      t.string :lock_type
      t.string :url
      t.integer :community_id
      t.integer :tour_user_id
      t.boolean :is_resident
      t.integer :stop_ids, array: true, default: []
      t.jsonb :payload
      t.jsonb :response

      t.timestamps
    end
  end
end
