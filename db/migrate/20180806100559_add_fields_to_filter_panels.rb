class AddFieldsToFilterPanels < ActiveRecord::Migration[5.0]
  def change
    add_column :filter_panels, :display_gallery_button_on_background_color, :boolean,default: false
    add_column :filter_panels, :gallery_button_on_background_color, :string
    add_column :filter_panels, :display_filter_panel_icon, :boolean,default: false
  end
end
