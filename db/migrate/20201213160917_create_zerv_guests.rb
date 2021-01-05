class CreateZervGuests < ActiveRecord::Migration[5.0]
  def change
    create_table :zerv_guests do |t|
      t.string :status
      t.jsonb :res_errors
      t.references :tour_user, foreign_key: true
      t.references :community, foreign_key: true
      t.references :guest_of_stop, polymorphic: true

      t.timestamps
    end
  end
end
