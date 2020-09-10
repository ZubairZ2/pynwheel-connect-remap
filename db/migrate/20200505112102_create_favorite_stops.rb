class CreateFavoriteStops < ActiveRecord::Migration[5.0]
  def change
    create_table :favorite_stops do |t|
      t.text :favorite_unit, array: true, default: []
      t.text :favorite_amenity, array: true, default: []
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
