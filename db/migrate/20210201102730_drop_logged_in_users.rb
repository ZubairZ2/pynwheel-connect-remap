class DropLoggedInUsers < ActiveRecord::Migration[5.0]
  def change
    drop_table :logged_in_users
  end
end
