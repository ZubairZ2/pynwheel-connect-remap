class AddLatitudeFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :latitude, :decimal
    add_column :tour_histories, :longitude, :decimal
    add_column :tour_histories, :is_virtual_tour, :boolean, default: false

    add_column :tour_users, :latitude, :decimal
    add_column :tour_users, :longitude, :decimal
    add_column :tour_users, :is_virtual_tour, :boolean, default: false
  end
end
