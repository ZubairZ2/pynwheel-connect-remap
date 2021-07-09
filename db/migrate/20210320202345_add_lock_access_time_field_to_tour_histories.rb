class AddLockAccessTimeFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :lock_access_time, :time
    add_column :tour_users, :lock_access_time, :time
    add_column :visited_stops, :stop_pin, :string
  end
end
