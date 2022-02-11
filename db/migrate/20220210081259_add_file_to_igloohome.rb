class AddFileToIgloohome < ActiveRecord::Migration[5.0]
  def change
    add_column :igloohomes, :file, :string
  end
end
