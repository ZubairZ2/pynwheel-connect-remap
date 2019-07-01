class AddDeviceIdFieldToVisitedStops < ActiveRecord::Migration[5.0]
  def change
    add_column :visited_stops, :device_id, :string
    add_column :visited_stops, :tour_key, :string
  end
end
