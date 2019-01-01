class ChangeFilterPanelButtonsShowBackroundColor < ActiveRecord::Migration[5.0]
  def change
    change_column :filter_panels, :filter_panel_buttons_show_backround_color,  :boolean, :default => true
    change_column :expressionists, :display_button_on_bg_color, :boolean, :default => true
  end
end
