class AddVerifiedAtColumnsToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :authentiq_verified_at, :datetime
    add_column :tour_users, :checkpoint_verified_at, :datetime
    remove_column :tour_users, :verified_at, :datetime
  end
end
