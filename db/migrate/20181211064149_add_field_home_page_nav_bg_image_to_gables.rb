class AddFieldHomePageNavBgImageToGables < ActiveRecord::Migration[5.0]
  def change
    add_column :gables, :home_page_nav_bg_image, :string
    add_column :gables, :display_home_page_nav_bg_image_button, :boolean, default: false

    add_column :gables, :global_nav_bg_image, :string
    add_column :gables, :display_global_nav_bg_image_button, :boolean, default: false

    add_column :gables, :filter_panel_bg_image, :string
    add_column :gables, :display_filter_panel_bg_image_button, :boolean, default: false
  end
end
