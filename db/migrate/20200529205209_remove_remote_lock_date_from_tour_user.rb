class RemoveRemoteLockDateFromTourUser < ActiveRecord::Migration[5.0]
  def change
    remove_column :tour_users, :edgestate_pin, :string
    remove_column :tour_users, :edgestate_guest_id, :string
  end
end
