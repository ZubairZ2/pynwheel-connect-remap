class AddTourIdFieldToVisitedStops < ActiveRecord::Migration[5.0]
  def change
    add_column :visited_stops, :tour_id, :integer
  end
end
