class AddIsLeftToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :is_left, :boolean, default: false
  end
end

