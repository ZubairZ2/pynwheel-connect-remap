class CreateAmenityGalleries < ActiveRecord::Migration[5.0]
  def change
    create_table :amenity_galleries do |t|
      t.references :amenity, foreign_key: true
      t.string :image
      t.string :description
      t.string :name

      t.timestamps
    end
  end
end
