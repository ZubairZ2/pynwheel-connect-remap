class AddImageUrlsToHomePageImages < ActiveRecord::Migration[5.0]
  def change
    add_column :home_page_images, :standard_image_url, :string
    add_column :home_page_images, :thumb_image_url, :string
    add_column :home_page_images, :large_image_url, :string
  end
end
