class AddRegionRefferenceInCommunityGroup < ActiveRecord::Migration[5.0]
  def change
  	add_reference :community_groups, :region, index: true
  end
end
