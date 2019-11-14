class AddPhoneNumberToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :phone_number, :string
  end
end
