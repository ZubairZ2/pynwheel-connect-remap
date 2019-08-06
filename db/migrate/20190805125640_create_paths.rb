class CreatePaths < ActiveRecord::Migration[5.0]
  def change
    create_table :paths do |t|
      t.string :name
      t.integer :map_path_id
      t.string :map_path_type

      t.timestamps
    end
  end
end
