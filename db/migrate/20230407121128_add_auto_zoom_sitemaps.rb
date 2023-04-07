class AddAutoZoomSitemaps < ActiveRecord::Migration[5.0]
  def up
    add_column :communities, :sitemap_auto_zoom, :boolean, default: false, if_exists: false
  end

  def down
    remove_column :communities, :sitemap_auto_zoom, if_exists: true
  end
end
