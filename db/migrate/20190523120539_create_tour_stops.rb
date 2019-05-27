class CreateTourStops < ActiveRecord::Migration[5.0]
  def change
    create_table :tour_stops do |t|
      t.references :tour, foreign_key: true
      t.decimal :latitude
      t.decimal :longitude
      t.integer :stop_id
      t.string :stop_type
      t.integer :sort

      t.timestamps
    end
  end
end
