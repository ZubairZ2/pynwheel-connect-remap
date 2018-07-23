class AddGalleryImageOnToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :gallery_image_on, :string
  end
end
