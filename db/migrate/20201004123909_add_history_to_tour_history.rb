class AddHistoryToTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :history, :boolean, default:  false
  end
end
