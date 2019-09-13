class AddLengthyStayToTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :lengthy_stay, :datetime
  end
end
