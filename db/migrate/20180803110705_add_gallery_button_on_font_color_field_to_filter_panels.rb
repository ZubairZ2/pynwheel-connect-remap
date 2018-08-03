class AddGalleryButtonOnFontColorFieldToFilterPanels < ActiveRecord::Migration[5.0]
  def change
    add_column :filter_panels, :gallery_button_on_font_color, :string
  end
end
