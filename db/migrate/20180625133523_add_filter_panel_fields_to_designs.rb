class AddFilterPanelFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :filter_panel_color, :string
    add_column :designs, :filter_panel_font_style, :string
    add_column :designs, :filter_panel_font_color, :string
    add_column :designs, :filter_button_color, :string
    add_column :designs, :filter_button_font_style, :string
    add_column :designs, :filter_button_font_color, :string
    add_column :designs, :filter_panel_opacity, :string
    add_column :designs, :filter_buttons_opacity, :string
    add_column :designs, :gallery_buttons_opacity, :string
    add_column :designs, :filter_menu_buttons_border, :string
    add_column :designs, :gallery_buttons_border, :string
    add_column :designs, :filter_button, :string
    add_column :designs, :gallery_button, :string
    add_column :designs, :filter_panel_background_image, :string
  end
end
