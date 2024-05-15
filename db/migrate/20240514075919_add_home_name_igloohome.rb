class AddHomeNameIgloohome < ActiveRecord::Migration[5.0]
  def change
    add_column :igloohomes, :home_name, :string
  end
end
