class CreateNeighborhoods < ActiveRecord::Migration[5.0]
  def change
    create_table :neighborhoods do |t|
      t.references :community, foreign_key: true
      t.string :address
      t.decimal :latitude
      t.decimal :longitude
      t.float :radius

      t.timestamps
    end
  end
end
