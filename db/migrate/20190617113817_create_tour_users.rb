class CreateTourUsers < ActiveRecord::Migration[5.0]
  def change
    create_table :tour_users do |t|
      t.string :name
      t.integer :phone_number
      t.string :email

      t.timestamps
    end
  end
end
