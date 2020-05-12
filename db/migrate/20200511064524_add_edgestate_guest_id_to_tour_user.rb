class AddEdgestateGuestIdToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :edgestate_guest_id, :string
  end
end
