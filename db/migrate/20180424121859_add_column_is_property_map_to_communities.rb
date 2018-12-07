class AddColumnIsPropertyMapToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :is_sitemap, :boolean, default: true
  end
end
