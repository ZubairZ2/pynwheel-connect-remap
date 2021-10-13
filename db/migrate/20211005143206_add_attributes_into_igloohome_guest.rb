class AddAttributesIntoIgloohomeGuest < ActiveRecord::Migration[5.0]
  def change
    add_column :igloohome_guests, :stop_id, :string
    add_column :igloohome_guests, :stop_type, :string
    add_column :igloohome_guests, :guest_bluetooth_key, :string
    add_column :igloohome_guests, :guest_key, :string
  end
end
