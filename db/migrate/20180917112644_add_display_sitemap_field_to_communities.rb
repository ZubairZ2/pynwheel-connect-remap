class AddDisplaySitemapFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_sitemap, :boolean, default: false
    add_column :communities, :display_floorplan_gallery, :boolean, default: false
  end
end
