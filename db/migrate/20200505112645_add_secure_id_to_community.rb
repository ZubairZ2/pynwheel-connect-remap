class AddSecureIdToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :secure_id, :string
  end
end
