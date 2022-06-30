class AddPinCodeToUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :pin_code, :string
  end
end
