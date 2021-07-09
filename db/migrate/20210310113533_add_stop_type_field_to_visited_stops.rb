class AddStopTypeFieldToVisitedStops < ActiveRecord::Migration[5.0]
  def change
    add_column :visited_stops, :stop_type, :string
  end
end
