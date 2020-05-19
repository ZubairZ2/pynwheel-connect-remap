class AddMaxTourUsersToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :max_tour_users, :string
  end
end
