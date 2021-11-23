class CreateDoors < ActiveRecord::Migration[5.0]
  def change
    create_table :doors do |t|
      t.string :name
      t.integer :floor

      t.integer :x_plot, default: 0
      t.integer :y_plot, default: 0

      t.string :lock_provider, default: ""
      t.string :access_code, default: ""

      t.references :community, foreign_key: true
      t.references :floorplate, foreign_key: true
      t.references :sitemap, foreign_key: true
      t.references :attached_with, polymorphic: true

      t.timestamps
    end
  end
end
