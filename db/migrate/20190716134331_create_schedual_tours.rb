class CreateSchedualTours < ActiveRecord::Migration[5.0]
  def change
    create_table :schedual_tours do |t|
      t.date :tour_date
      t.time :tour_time
      t.references :tour_user, foreign_key: true
      t.references :tour, foreign_key: true

      t.timestamps
    end
  end
end
