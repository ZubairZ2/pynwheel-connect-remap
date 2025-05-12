class AddMarkerAvailabilityColorToDesigns < ActiveRecord::Migration[7.2]
  def change
    add_column :designs, :property_map_occupied_color, :text, default: "#f2f2f2"
    add_column :designs, :property_map_occupied_on_notice_color, :text, default: "#8545a1"
    add_column :designs, :property_map_vacant_leased_color, :text, default: "#f9d648"
    add_column :designs, :property_map_model_color, :text, default: "#f57396"
  end
end
