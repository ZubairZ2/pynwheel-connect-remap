class AddMasterCommunityFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :master_community, :boolean, default: false
  end
end
