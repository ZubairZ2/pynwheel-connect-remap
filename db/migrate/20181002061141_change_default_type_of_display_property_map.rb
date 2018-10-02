class ChangeDefaultTypeOfDisplayPropertyMap < ActiveRecord::Migration[5.0]
  def change
  	change_column :communities, :display_sitemap, :boolean, default: true
  	change_column :communities, :display_floorplan_gallery, :boolean, default: true
  end
end
