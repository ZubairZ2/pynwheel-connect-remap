class AddIconBackgroundColorToFilterPanels < ActiveRecord::Migration[5.0]
  def change
    add_column :filter_panels, :icon_background_color, :string
  end
end
