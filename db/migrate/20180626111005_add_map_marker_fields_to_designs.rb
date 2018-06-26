class AddMapMarkerFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :marker_background_color, :string
    add_column :designs, :marker_style, :string
  end
end
