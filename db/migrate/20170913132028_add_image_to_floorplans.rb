class AddImageToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :image, :string
  end
end
