class AddProductsOptionsForCommunities < ActiveRecord::Migration[5.0]
  def change
    remove_column :community_users, :product_options
    add_column :communities, :product_options, :jsonb
  end
end
