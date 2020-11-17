class AddStatusToLatchGuest < ActiveRecord::Migration[5.0]
  def change
    add_column :latch_guests, :status, :string
  end
end
