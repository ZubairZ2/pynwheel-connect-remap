class AddCommunityProductOptions < ActiveRecord::Migration[5.0]
  def change
    add_column :community_users, :product_options, :jsonb
  end
end
