class AddAbandonedTourTimeFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :abandoned_tour_time, :datetime
  end
end
