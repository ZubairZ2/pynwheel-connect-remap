class AddSecureIdToUser < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :secure_id, :string
  end
end
