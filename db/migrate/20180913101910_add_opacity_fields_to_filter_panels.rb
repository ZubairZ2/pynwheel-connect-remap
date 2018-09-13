class AddOpacityFieldsToFilterPanels < ActiveRecord::Migration[5.0]
  def change
    add_column :filter_panels, :icon_background_color_opacity, :string
    add_column :filter_panels, :gallery_button_on_background_color_opacity, :string
  end
end
