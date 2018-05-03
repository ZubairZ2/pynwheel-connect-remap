class AddStandardImageUrlToFloorplates < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplates, :standard_image_url, :string
    add_column :floorplates, :svg_image_url, :string
  end
end
