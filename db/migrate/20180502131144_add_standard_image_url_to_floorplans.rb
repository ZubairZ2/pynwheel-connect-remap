class AddStandardImageUrlToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :standard_image_url, :string
  end
end
