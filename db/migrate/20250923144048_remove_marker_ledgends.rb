class RemoveMarkerLedgends < ActiveRecord::Migration[7.2]
  def change
    remove_column :communities, :enable_amenity_legend, :boolean
    remove_column :communities, :enable_home_legend, :boolean
  end
end
