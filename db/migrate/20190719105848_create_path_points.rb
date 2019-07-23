class CreatePathPoints < ActiveRecord::Migration[5.0]
  def change
    create_table :path_points do |t|
      t.integer :x
      t.integer :y
      t.references :floorplate, foreign_key: true

      t.timestamps
    end
  end
end
