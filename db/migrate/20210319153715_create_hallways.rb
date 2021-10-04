class CreateHallways < ActiveRecord::Migration[5.0]
  def change
    create_table :hallways do |t|
      t.float :x_plot
      t.float :y_plot
      t.references :parent, polymorphic: true
      t.timestamps
    end
  end
end
