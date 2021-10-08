class PynwheelAccessUserZervGuests < ActiveRecord::Migration[5.0]
  def change
    add_reference :zerv_guests, :pynwheel_access_user, index: true
  end
end
