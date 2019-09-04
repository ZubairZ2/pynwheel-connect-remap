class AddCommunityGroupIdFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_reference :communities, :community_group, index: true
  end
end
