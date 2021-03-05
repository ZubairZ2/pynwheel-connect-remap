class CreateDoors < ActiveRecord::Migration[5.0]
  def change
    create_table :doors do |t|
      t.string :name
      t.integer :x_plot, default: 0
      t.integer :y_plot, default: 0
      t.references :community, foreign_key: true
      t.references :attached_with, polymorphic: true
      t.timestamps
    end
  end
end
