class RemoveNoShowsColumnFromTourHistories < ActiveRecord::Migration[5.0]
  def change
    remove_column :tour_histories, :not_on_time
  end
end
