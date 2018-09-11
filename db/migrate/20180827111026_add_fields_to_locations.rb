class AddFieldsToLocations < ActiveRecord::Migration[5.0]
  def change
    add_column :locations, :image, :string
    add_column :locations, :standard_image_url, :string
    add_column :locations, :distance, :float
    add_column :locations, :time, :string
    add_column :locations, :rating, :float
  end
end
