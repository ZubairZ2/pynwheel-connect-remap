class AddDetailsInDoors < ActiveRecord::Migration[5.0]
  def change
    remove_column :doors, :floorplate_id
    remove_column :doors, :sitemap_id
  	add_column :doors, :name_overrided, :boolean, default: false
  end
end
