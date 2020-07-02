class CreateIglooGuests < ActiveRecord::Migration[5.0]
  def change
    create_table :igloo_guests do |t|
      t.string :guest_type
      t.string :guest_code
      t.string :guest_id
      t.string :status
      t.references :community, foreign_key: true
      t.references :tour_user, foreign_key: true

      t.timestamps
    end
  end
end
