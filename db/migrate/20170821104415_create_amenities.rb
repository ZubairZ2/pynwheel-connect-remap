class CreateAmenities < ActiveRecord::Migration[5.0]
  def change
    create_table :amenities do |t|
      t.string :provider_amenity_id
      t.string :amenty_type
      t.text :description
      t.integer :unit_id

      t.timestamps
    end
  end
end
