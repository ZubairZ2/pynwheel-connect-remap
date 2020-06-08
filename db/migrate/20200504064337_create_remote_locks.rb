class CreateRemoteLocks < ActiveRecord::Migration[5.0]
  def change
    create_table :remote_locks do |t|
      t.string :type
      t.string :name
      t.references :unit, foreign_key: true
      t.string :unit_name
      t.references :amenity, foreign_key: true
      t.string :amenity_name
      t.references :edge_state, foreign_key: true

      t.timestamps
    end
  end
end
