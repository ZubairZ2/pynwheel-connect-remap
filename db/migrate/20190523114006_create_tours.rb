class CreateTours < ActiveRecord::Migration[5.0]
  def change
    create_table :tours do |t|
      t.references :community, foreign_key: true
      t.string :name
      t.decimal :latitude
      t.decimal :longitude
      t.string :image

      t.timestamps
    end
  end
end
