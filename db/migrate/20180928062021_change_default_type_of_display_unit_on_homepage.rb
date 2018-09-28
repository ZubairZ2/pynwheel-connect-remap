class ChangeDefaultTypeOfDisplayUnitOnHomepage < ActiveRecord::Migration[5.0]
  def change
  	change_column :neighborhoods, :display_neighborhood_on_homepage, :boolean, default: true
  	change_column :communities, :display_gallery_on_homepage, :boolean, default: true
  	change_column :communities, :display_unit_on_homepage, :boolean, default: true
  end
end
