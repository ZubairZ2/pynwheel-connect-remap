class AddSiteImageUrlToUnit < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :sitemap_image_url, :string
  end
end
