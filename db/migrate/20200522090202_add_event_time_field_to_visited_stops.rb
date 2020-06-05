class AddEventTimeFieldToVisitedStops < ActiveRecord::Migration[5.0]
  def change
    add_column :visited_stops, :event_time, :time
    add_column :visited_stops, :event_date, :date
  end
end

