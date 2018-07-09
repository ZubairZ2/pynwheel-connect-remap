class AddFieldsToFavoriteImages < ActiveRecord::Migration[5.0]
  def change
  	add_column :favorite_images, :name, :string
    add_column :favorite_images, :sort, :integer
  end
end
