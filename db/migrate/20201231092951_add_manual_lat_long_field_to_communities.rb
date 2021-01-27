class AddManualLatLongFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :manual_lat_long, :boolean, default: false
  end
end
