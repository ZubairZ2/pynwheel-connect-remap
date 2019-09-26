class AddDayDifferenceToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :day_diff, :integer
  end
end
