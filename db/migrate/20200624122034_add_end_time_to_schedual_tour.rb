class AddEndTimeToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :end_time, :time
  end
end
