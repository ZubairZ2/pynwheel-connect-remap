class AddEmailToIgloohome < ActiveRecord::Migration[5.0]
  def change
    add_column :igloohomes, :email, :string
  end
end
