class CreateFloorplans < ActiveRecord::Migration[5.0]
  def change
    create_table :floorplans do |t|
      t.integer :community_id
      t.string :provider
      t.string :property_id
      t.string :provider_floorplan_id
      t.string :name
      t.integer :unit_count
      t.integer :units_available
      t.string :bedrooms
      t.float :bathrooms
      t.float :market_rent
      t.float :square_feet
      t.float :deposit
      t.text :comment
      t.text :description
      t.string :image
      t.string :file_url

      t.timestamps
    end
  end
end
