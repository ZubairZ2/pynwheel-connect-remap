class ChangeGlobalNavigationShowBackgroundColor < ActiveRecord::Migration[5.0]
  def change
    change_column :filter_panels, :display_filter_panel_icon, :boolean, :default => true
    change_column :filter_panels, :filter_buttons_icons_position, :string, :default => "Right of text"
    change_column :filter_panels, :filter_panel_buttons_show_backround_color, :string, :default => true
    change_column :expressionists, :display_home_page_nav_background_image, :boolean, :default => true

  end
end
