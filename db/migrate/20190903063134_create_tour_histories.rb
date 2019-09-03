class CreateTourHistories < ActiveRecord::Migration[5.0]
  def change
    create_table :tour_histories do |t|
      t.datetime :arrived
      t.datetime :left
      t.string :lengthy_stay
      t.boolean :id_mismatch
      t.integer :abandoned_tour_at_stop
      t.references :tour_user, foreign_key: true

      t.timestamps
    end
  end
end
