class AddResidentOtpVerificationAttributes < ActiveRecord::Migration[5.0]
  def change
    add_column :pynwheel_access_users, :is_verified, :boolean, default: false
    add_column :pynwheel_access_users, :pin_code, :string
  end
end
