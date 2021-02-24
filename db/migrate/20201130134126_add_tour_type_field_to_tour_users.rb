class AddTourTypeFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :tour_type, :string, default: "self_tour"
    add_column :schedual_tours, :tour_type, :string, default: "self_tour"

    add_column :tours, :max_virtual_tour_users, :integer
    add_column :tours, :max_self_tour_users, :integer
    add_column :tours, :max_guided_tour_users, :integer
  end
end
