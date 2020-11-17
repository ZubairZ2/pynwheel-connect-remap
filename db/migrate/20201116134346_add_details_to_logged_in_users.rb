class AddDetailsToLoggedInUsers < ActiveRecord::Migration[5.0]
  def change
    rename_column :logged_in_users, :session_id, :browser_id
    remove_reference :logged_in_users, :community, index: true, foreign_key: true
  end
end
