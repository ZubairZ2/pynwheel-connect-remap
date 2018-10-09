class AddSecondaryImageFieldToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :secondary_image, :string
  end
end
