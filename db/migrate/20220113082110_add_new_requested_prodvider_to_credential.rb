class AddNewRequestedProdviderToCredential < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :new_requested_data_provider, :string
  end
end
