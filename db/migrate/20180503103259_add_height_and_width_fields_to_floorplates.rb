class AddHeightAndWidthFieldsToFloorplates < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplates, :height, :float
    add_column :floorplates, :width, :float
  end
end
