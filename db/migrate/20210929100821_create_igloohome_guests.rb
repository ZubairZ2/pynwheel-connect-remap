class CreateIgloohomeGuests < ActiveRecord::Migration[5.0]
  def change
    create_table :igloohome_guests do |t|
      t.string :guest_pin
      t.references :community, foreign_key: true
      t.references :tour_user, foreign_key: true
      
      t.timestamps
    end
  end
end
