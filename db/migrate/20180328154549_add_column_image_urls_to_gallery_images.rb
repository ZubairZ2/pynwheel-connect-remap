class AddColumnImageUrlsToGalleryImages < ActiveRecord::Migration[5.0]
  def change
    add_column :gallery_images, :image_url, :string
    add_column :gallery_images, :ios_image_url, :string
    add_column :gallery_images, :large_image_url, :string
  end
end
