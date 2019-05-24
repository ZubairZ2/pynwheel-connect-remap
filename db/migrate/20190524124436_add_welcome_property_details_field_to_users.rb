class AddWelcomePropertyDetailsFieldToUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :welcome_property_details_page, :boolean,default: false
    add_column :users, :welcome_logo_page, :boolean,default: false
    add_column :users, :welcome_homepage_page, :boolean,default: false
    add_column :users, :welcome_floorplate_page, :boolean,default: false
    add_column :users, :welcome_amenity_page, :boolean,default: false
    add_column :users, :welcome_floorplan_page, :boolean,default: false
    add_column :users, :welcome_sitemap_page, :boolean,default: false
    add_column :users, :welcome_edit_floorplan_page, :boolean,default: false
    add_column :users, :welcome_unit_page, :boolean,default: false
    add_column :users, :welcome_neighbourhood_page, :boolean,default: false
    add_column :users, :welcome_favorite_page, :boolean,default: false
    add_column :users, :welcome_additional_page, :boolean,default: false
    add_column :users, :welcome_gallery_page, :boolean,default: false
  end
end
