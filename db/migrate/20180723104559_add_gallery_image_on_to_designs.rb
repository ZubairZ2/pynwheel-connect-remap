class AddGalleryImageOnToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :gallery_button_on_image, :string
    add_column :designs, :gallery_button_on_as_image, :boolean, default: false
  end
end
