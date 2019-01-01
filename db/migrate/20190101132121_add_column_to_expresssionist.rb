class AddColumnToExpresssionist < ActiveRecord::Migration[5.0]
  def change
    remove_column :filter_panels, :filter_panel_buttons_show_backround_color, :string, :default => true
    add_column :filter_panels, :filter_panel_buttons_show_backround_color, :boolean, :default => true

    change_column :expressionists, :display_home_page_nav_background_image, :boolean, :default => false
    change_column :expressionists, :display_home_page_nav_background, :boolean, :default => true
  end
end
