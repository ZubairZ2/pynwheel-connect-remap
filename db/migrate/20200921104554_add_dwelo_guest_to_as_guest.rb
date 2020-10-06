class AddDweloGuestToAsGuest < ActiveRecord::Migration[5.0]
  def change
    add_column :as_guests, :dwelo_guest, :boolean, default: :false
  end
end
