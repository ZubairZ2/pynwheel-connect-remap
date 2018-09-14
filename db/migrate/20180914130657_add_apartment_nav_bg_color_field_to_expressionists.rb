class AddApartmentNavBgColorFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :apartment_nav_bg_color, :string
    add_column :expressionists, :gallery_nav_bg_color, :string
    add_column :expressionists, :favourities_nav_bg_color, :string
    add_column :expressionists, :additional_pages_nav_bg_color, :string
  end
end
