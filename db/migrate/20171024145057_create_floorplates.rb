class CreateFloorplates < ActiveRecord::Migration[5.0]
  def change
    create_table :floorplates do |t|
      t.string :name
      t.integer :number
      t.string :building
      t.integer :range
      t.string :image
      t.integer :community_id

      t.timestamps
    end
  end
end
