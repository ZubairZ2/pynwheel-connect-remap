class AddDoCropFieldToGalleries < ActiveRecord::Migration[5.0]
  def change
    add_column :gallery_images, :do_crop, :boolean, default: false
    add_column :home_page_images, :do_crop, :boolean, default: false
    add_column :additional_images, :do_crop, :boolean, default: false
  end
end
