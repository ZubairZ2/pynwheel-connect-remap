class AddDefaultSatelliteViewToCommunities < ActiveRecord::Migration[6.0]
  def change
    add_column :communities, :default_satellite_view, :boolean, default: false
  end
end
