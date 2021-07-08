class AddIdVerificationColumnsToTourUser < ActiveRecord::Migration[5.0]
  def change
    remove_column :tour_users, :is_verified, :boolean, default: false
    add_column :tour_users, :is_authentiq_verified, :boolean, default: false
    add_column :tour_users, :is_checkpoint_verified, :boolean, default: false
  end
end
