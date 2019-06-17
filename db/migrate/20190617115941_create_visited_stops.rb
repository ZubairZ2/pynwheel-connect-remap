class CreateVisitedStops < ActiveRecord::Migration[5.0]
  def change
    create_table :visited_stops do |t|
      t.references :tour_user, foreign_key: true
      t.string :image
      t.integer :tour_stop_id
      t.string :description

      t.timestamps
    end
  end
end
