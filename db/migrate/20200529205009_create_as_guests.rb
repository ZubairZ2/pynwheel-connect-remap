class CreateAsGuests < ActiveRecord::Migration[5.0]
  def change
    create_table :as_guests do |t|
      t.references :community, foreign_key: true
      t.string :guest_id
      t.string :edgestate_pin
      t.references :tour_user, foreign_key: true

      t.timestamps
    end
  end
end
