class AddVideoFieldToGalleryImages < ActiveRecord::Migration[5.0]
  def change
    add_column :gallery_images, :video, :string
  end
end
