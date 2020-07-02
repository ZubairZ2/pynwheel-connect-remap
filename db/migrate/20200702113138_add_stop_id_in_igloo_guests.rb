class AddStopIdInIglooGuests < ActiveRecord::Migration[5.0]
  def change
    add_column :igloo_guests, :stop_id, :integer
  end
end
