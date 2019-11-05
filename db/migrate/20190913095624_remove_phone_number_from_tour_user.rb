class RemovePhoneNumberFromTourUser < ActiveRecord::Migration[5.0]
  def change
    remove_column :tour_users, :phone_number, :integer
  end
end
