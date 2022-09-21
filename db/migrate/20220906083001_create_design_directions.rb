class CreateDesignDirections < ActiveRecord::Migration[5.0]
  def change
    create_table :design_directions do |t|
      t.string :image
      t.string :hex_colors
      t.string :direction
      t.string :additional_direction
      t.references :community
      t.timestamps
    end
  end
end
