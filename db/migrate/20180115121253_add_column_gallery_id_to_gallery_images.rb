class AddColumnGalleryIdToGalleryImages < ActiveRecord::Migration[5.0]
  def change
    add_reference :gallery_images, :gallery, foreign_key: true
  end
end
