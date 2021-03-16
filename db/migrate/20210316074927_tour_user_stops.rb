class TourUserStops < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :stops_list, :integer, array: true, default: []
  end

  def down
    remove_column :tour_users, :stops_list, :integer, array: true, default: []
  end
end
