class CreateElevators < ActiveRecord::Migration[5.0]
  def change
    create_table :elevators do |t|
      t.string :name
      t.string :description
      t.integer :x_plot
      t.integer :y_plot
      t.string :directional_text
      t.references :floorplate, foreign_key: true
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
