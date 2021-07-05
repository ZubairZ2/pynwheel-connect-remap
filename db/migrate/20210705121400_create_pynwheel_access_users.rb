class CreatePynwheelAccessUsers < ActiveRecord::Migration[5.0]
  def change
    create_table :pynwheel_access_users do |t|
      t.references :community, foreign_key: true

      t.integer :user_type
      t.string :name
      t.string :first_name
      t.string :last_name
      t.string :email
      t.string :phone_number
      t.datetime :move_in_date
      t.datetime :move_out_date
      t.datetime :lease_in_date
      t.datetime :lease_out_date

      t.timestamps
    end
  end
end
