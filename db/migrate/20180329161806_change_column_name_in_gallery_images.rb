class ChangeColumnNameInGalleryImages < ActiveRecord::Migration[5.0]
  def change
    rename_column :gallery_images, :image_url, :standard_image_url
  end
end
