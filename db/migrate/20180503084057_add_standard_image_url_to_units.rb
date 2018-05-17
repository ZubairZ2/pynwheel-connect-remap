class AddStandardImageUrlToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :standard_image_url, :string
  end
end
