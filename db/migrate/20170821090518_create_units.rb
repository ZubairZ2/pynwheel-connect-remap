class CreateUnits < ActiveRecord::Migration[5.0]
  def change
    create_table :units do |t|
      t.integer :community_id
      t.string :provider
      t.string :property_id
      t.string :provider_unit_id
      t.string :name
      t.integer :number
      t.integer :floorplan_id
      t.float :avg_rent
      t.float :min_rent
      t.integer :max_rent
      t.string :availability
      t.date :available_date
      t.string :building

      t.timestamps
    end
  end
end
