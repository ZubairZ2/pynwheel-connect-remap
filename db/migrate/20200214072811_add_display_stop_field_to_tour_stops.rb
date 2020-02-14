class AddDisplayStopFieldToTourStops < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_stops, :display_stop, :boolean, default: true
  end
end
