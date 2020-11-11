class CreateLoggedInUsers < ActiveRecord::Migration[5.0]
  def change
    create_table :logged_in_users do |t|
      t.references :user, foreign_key: true
      t.references :community, foreign_key: true
      t.string :session_id
      t.integer :logged_in_count, default: 0

      t.timestamps
    end
  end
end
