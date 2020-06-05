class CreateLockHistories < ActiveRecord::Migration[5.0]
  def change
    create_table :lock_histories do |t|
      t.string :event
      t.datetime :occured_at
      t.integer :stop_id
      t.string :stop_name
      t.string :stop_type
      t.references :tour_user, foreign_key: true
      t.references :tour_history, foreign_key: true

      t.timestamps
    end
  end
end
