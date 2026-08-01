class AddGalleryImageIdsToFavorites < ActiveRecord::Migration[7.2]
  def change
    add_column :favorites, :gallery_image_ids, :jsonb, default: []
  end
end
