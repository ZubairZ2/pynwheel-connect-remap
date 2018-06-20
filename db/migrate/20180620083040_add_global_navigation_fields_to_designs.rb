class AddGlobalNavigationFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :global_navigation_font_color, :string
    add_column :designs, :global_navigation_background_color, :string
    add_column :designs, :global_navigation_button_color, :string
    add_column :designs, :global_navigation_buttons_opacity, :string
    add_column :designs, :global_nav_bg_opacity, :string
    add_column :designs, :button_shape, :string
    add_column :designs, :global_nav_buttons_height, :string
    add_column :designs, :global_nav_buttons_width, :string
    add_column :designs, :secondary_page_menu_border, :string
    add_column :designs, :global_nav_button_on, :string
    add_column :designs, :global_nav_button_off, :string
  end
end
