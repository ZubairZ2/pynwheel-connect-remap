class RemoveCreditCardFromTourUsers < ActiveRecord::Migration[5.0]
  def change
    remove_column :tour_users, :credit_card_number, :string
  end
end
