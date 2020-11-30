class AddTourTypeFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :tour_type, :string, default: "self_tour"
    add_column :schedual_tours, :tour_type, :string, default: "self_tour"
  end
end
