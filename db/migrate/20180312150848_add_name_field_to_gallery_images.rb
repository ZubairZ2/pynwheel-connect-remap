class AddNameFieldToGalleryImages < ActiveRecord::Migration[5.0]
  def change
    add_column :gallery_images, :name, :string
  end
end
