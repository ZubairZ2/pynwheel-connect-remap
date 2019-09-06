class RemoveLengthyStayFromTourHistory < ActiveRecord::Migration[5.0]
  def change
    remove_column :tour_histories, :lengthy_stay, :string
  end
end
