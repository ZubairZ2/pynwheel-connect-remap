class AddVerificationColumnsToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :verified_at, :datetime
    add_column :tour_users, :is_verified, :boolean, default: false
  end
end
