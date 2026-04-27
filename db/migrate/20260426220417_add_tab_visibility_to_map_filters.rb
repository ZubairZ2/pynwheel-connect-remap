class AddTabVisibilityToMapFilters < ActiveRecord::Migration[7.2]
  def change
    add_column :map_filters, :marketing_units_tab_enabled,      :boolean, default: true, null: false
    add_column :map_filters, :marketing_floorplans_tab_enabled, :boolean, default: true, null: false
    add_column :map_filters, :marketing_amenities_tab_enabled,  :boolean, default: true, null: false
    add_column :map_filters, :marketing_favorites_tab_enabled,  :boolean, default: true, null: false
    add_column :map_filters, :ops_units_tab_enabled,            :boolean, default: true, null: false
    add_column :map_filters, :ops_floorplans_tab_enabled,       :boolean, default: true, null: false
    add_column :map_filters, :ops_amenities_tab_enabled,        :boolean, default: true, null: false
    add_column :map_filters, :ops_favorites_tab_enabled,        :boolean, default: true, null: false
  end
end
