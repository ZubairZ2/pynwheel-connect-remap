class CreateUserStripes < ActiveRecord::Migration[5.0]
  def change
    create_table :user_stripes do |t|
      t.references :user, foreign_key: true
      t.integer :charge_amount_in_cent
      t.string :charge_id
      t.string :refund_id
      t.integer :refund_amount_in_cent
      t.string :last_digits

      t.timestamps
    end
  end
end
