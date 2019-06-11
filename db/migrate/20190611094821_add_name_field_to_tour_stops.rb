class AddNameFieldToTourStops < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_stops, :name, :string
  end
end
