class CreateNeighbourUnits < ActiveRecord::Migration[5.0]
  def change
    create_table :neighbour_units do |t|
      t.references :path_point, foreign_key: true
      t.integer :unit_id

      t.timestamps
    end
  end
end
