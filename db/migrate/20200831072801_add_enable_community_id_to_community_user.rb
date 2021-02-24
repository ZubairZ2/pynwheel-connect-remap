class AddEnableCommunityIdToCommunityUser < ActiveRecord::Migration[5.0]
  def change
    add_column :community_users, :enable_community_id, :integer
  end
end
