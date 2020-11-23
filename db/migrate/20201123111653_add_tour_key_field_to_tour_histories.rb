class AddTourKeyFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :tour_key, :string
    add_column :tour_users, :tour_key, :string
  end
end
