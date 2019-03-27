class AddFilterPanelTextColorFieldToGables < ActiveRecord::Migration[5.0]
  def change
    add_column :gables, :filter_panel_text_color, :string
    add_column :gables, :filter_panel_opacity, :string

    add_column :gables, :application_bg_image_gables, :string
    add_column :gables, :apartment_bg_image_gables, :string
    add_column :gables, :gallery_bg_image_gables, :string
    add_column :gables, :favourite_bg_image_gables, :string
    add_column :gables, :additional_pages_bg_image_gables, :string

    add_column :gables, :display_application_bg_image_gables, :boolean
    add_column :gables, :display_apartment_bg_image_gables, :boolean
    add_column :gables, :display_gallery_bg_image_gables, :boolean
    add_column :gables, :display_favourite_bg_image_gables, :boolean
    add_column :gables, :display_additional_pages_bg_image_gables, :boolean
  end
end
