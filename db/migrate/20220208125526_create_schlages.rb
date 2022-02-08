class CreateSchlages < ActiveRecord::Migration[5.0]
  def change
    create_table :schlages do |t|
      t.string :email
      t.string :password
      t.references :unit, foreign_key: true
      t.string :unit_name
      t.references :amenity, foreign_key: true
      t.string :amenity_name
      t.references :edge_state, foreign_key: true
      t.string :stop_name
      t.timestamps
    end
  end
end
