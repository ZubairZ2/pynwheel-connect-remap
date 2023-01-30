class AddSelfGalleryImageId < ActiveRecord::Migration[5.0]
  def change
    add_column :amenity_galleries, :associated_amenity_gallery_id, :integer
  end
end