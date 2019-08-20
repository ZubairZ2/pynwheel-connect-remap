class CreateSharedTours < ActiveRecord::Migration[5.0]
  def change
    create_table :shared_tours do |t|
      t.string :name
      t.string :recipient_name
      t.string :phone
      t.string :email
      t.integer :tour_id

      t.timestamps
    end
    add_index :shared_tours, :tour_id
  end
end
