class AddTourIdFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :tour_id, :integer
  end
end
