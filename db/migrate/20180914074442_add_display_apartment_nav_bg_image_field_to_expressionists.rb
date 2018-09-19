class AddDisplayApartmentNavBgImageFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :display_apartment_nav_bg_image, :boolean ,default: false
    add_column :expressionists, :apartment_nav_bg_image, :string
    add_column :expressionists, :display_gallery_nav_bg_image, :boolean ,default: false
    add_column :expressionists, :gallery_nav_bg_image, :string
    add_column :expressionists, :display_favourities_nav_bg_image, :boolean ,default: false
    add_column :expressionists, :favourities_nav_bg_image, :string
    add_column :expressionists, :display_additional_pages_nav_bg_image, :boolean ,default: false
    add_column :expressionists, :additional_pages_nav_bg_image, :string
  end
end
