class PynwheelAccessUserIglooGuests < ActiveRecord::Migration[5.0]
  def change
    add_reference :igloo_guests, :pynwheel_access_user, index: true
  end
end
