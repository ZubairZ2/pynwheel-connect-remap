class AddFilterPanelIconColorToFilterPanels < ActiveRecord::Migration[5.0]
  def change
    add_column :filter_panels, :filter_panel_icon_color, :string
  end
end
