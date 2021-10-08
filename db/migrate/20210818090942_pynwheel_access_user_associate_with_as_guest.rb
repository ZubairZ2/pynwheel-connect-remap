class PynwheelAccessUserAssociateWithAsGuest < ActiveRecord::Migration[5.0]
  def change
    add_reference :as_guests, :pynwheel_access_user, index: true
  end
end
