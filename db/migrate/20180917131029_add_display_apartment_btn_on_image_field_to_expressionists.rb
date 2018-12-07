class AddDisplayApartmentBtnOnImageFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :display_apartment_btn_on_image, :boolean, default: false
    add_column :expressionists, :apartment_btn_on_image, :string
    add_column :expressionists, :display_gallery_btn_on_image, :boolean, default: false
    add_column :expressionists, :gallery_btn_on_image, :string
    add_column :expressionists, :display_neighborhood_btn_on_image, :boolean, default: false
    add_column :expressionists, :neighborhood_btn_on_image, :string
    add_column :expressionists, :display_imagepage_btn_on_image, :boolean, default: false
    add_column :expressionists, :imagepage_btn_on_image, :string
    add_column :expressionists, :display_webpage_btn_on_image, :boolean, default: false
    add_column :expressionists, :webpage_btn_on_image, :string
    add_column :expressionists, :display_favourite_btn_on_image, :boolean, default: false
    add_column :expressionists, :favourite_btn_on_image, :string

    add_column :expressionists, :display_apartment_btn_off_image, :boolean, default: false
    add_column :expressionists, :apartment_btn_off_image, :string
    add_column :expressionists, :display_gallery_btn_off_image, :boolean, default: false
    add_column :expressionists, :gallery_btn_off_image, :string
    add_column :expressionists, :display_neighborhood_btn_off_image, :boolean, default: false
    add_column :expressionists, :neighborhood_btn_off_image, :string
    add_column :expressionists, :display_imagepage_btn_off_image, :boolean, default: false
    add_column :expressionists, :imagepage_btn_off_image, :string
    add_column :expressionists, :display_webpage_btn_off_image, :boolean, default: false
    add_column :expressionists, :webpage_btn_off_image, :string
    add_column :expressionists, :display_favourite_btn_off_image, :boolean, default: false
    add_column :expressionists, :favourite_btn_off_image, :string

    add_column :expressionists, :global_navigation_btn_on_for_all, :boolean, default: false
    add_column :expressionists, :global_navigation_btn_off_for_all, :boolean, default: false

  end
end
