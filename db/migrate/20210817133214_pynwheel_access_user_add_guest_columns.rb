class PynwheelAccessUserAddGuestColumns < ActiveRecord::Migration[5.0]
  def change
    add_column :pynwheel_access_users, :guest_id, :string
    add_column :pynwheel_access_users, :random_number, :integer
  end
end
