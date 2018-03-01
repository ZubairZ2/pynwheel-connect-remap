class CreateLocations < ActiveRecord::Migration[5.0]
  def change
    create_table :locations do |t|
      t.string :address
      t.decimal :latitude
      t.decimal :longitude
      t.string :category
      t.string :title
      t.references :neighborhood, foreign_key: true

      t.timestamps
    end
  end
end
