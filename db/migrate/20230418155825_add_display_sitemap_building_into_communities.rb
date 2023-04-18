class AddDisplaySitemapBuildingIntoCommunities < ActiveRecord::Migration[5.0]
  def up
    add_column :communities, :display_sitemap_building, :boolean, default: false, if_exists: false
  end

  def down
    remove_column :communities, :display_sitemap_building, if_exists: true
  end
end
