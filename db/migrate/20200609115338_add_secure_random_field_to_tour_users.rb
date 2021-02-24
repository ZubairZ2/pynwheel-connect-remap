class AddSecureRandomFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :secure_random, :string
  end
end
