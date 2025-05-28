class AddPropertyMapMissingColorToDesigns < ActiveRecord::Migration[7.2]
  def change
    add_column :designs, :property_map_missing_color, :text, default: "#eecea5"
  end
end
