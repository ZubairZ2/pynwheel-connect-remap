class AddSortFieldToTourStops < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_stops, :sort, :integer
  end
end
