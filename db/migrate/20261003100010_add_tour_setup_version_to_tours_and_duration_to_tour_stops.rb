# `tours.tour_setup_version`: compare-and-swap counter for Connect Tour Setup
# saves. `tour_stops.duration_minutes`: the dwell time per stop the Tour
# Setup screen edits (nil = not set, as today).
class AddTourSetupVersionToToursAndDurationToTourStops < ActiveRecord::Migration[7.2]
  def change
    add_column :tours, :tour_setup_version, :integer, null: false, default: 0
    add_column :tour_stops, :duration_minutes, :integer
  end
end
