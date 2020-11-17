class CreateLatchGuests < ActiveRecord::Migration[5.0]
  def change
    create_table :latch_guests do |t|
      t.references :community, foreign_key: true
      t.references :tour_user, foreign_key: true
      t.string :latch_link
      t.string :reservation_token
      t.integer :start_time
      t.integer :end_time

      t.timestamps
    end
  end
end
