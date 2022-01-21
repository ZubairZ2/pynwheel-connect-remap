class AddProductOptionsObjectIntoUsers < ActiveRecord::Migration[5.0]
  def up
    add_column :users, :product_options, :jsonb
  end

  def down
    remove_column :users, :product_options, :jsonb
  end

end
