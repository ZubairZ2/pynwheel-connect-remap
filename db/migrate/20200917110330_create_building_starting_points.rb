class CreateBuildingStartingPoints < ActiveRecord::Migration[5.0]
  def change
    create_table :building_starting_points do |t|
      t.references :community, foreign_key: true
      t.integer :x_plot
      t.integer :y_plot
      t.integer :floor
      t.string :name
      t.string :building
      t.string :image
      t.string :directional_text
      t.string :status

      t.timestamps
    end
  end
end
