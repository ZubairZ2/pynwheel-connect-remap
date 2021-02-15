class AddStripCustomerIdFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :strip_customer_id, :string
    add_column :tour_users, :card_last_digits, :string
  end
end
