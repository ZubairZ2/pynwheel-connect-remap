class AddCreditCardInfoToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :credit_card_number, :string
    add_column :tour_users, :card_expiry, :string
  end
end
