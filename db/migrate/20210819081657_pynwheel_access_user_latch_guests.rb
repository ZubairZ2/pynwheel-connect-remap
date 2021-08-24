class PynwheelAccessUserLatchGuests < ActiveRecord::Migration[5.0]
  def change
    add_reference :latch_guests, :pynwheel_access_user, index: true
  end
end
