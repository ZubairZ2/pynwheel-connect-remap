class AddFilterPanelButtonsShowBackroundColorFieldToFilterPanel < ActiveRecord::Migration[5.0]
  def change
    add_column :filter_panels, :filter_panel_buttons_show_backround_color, :boolean, default: false
    add_column :filter_panels, :filter_buttons_icons_position, :string
  end
end
