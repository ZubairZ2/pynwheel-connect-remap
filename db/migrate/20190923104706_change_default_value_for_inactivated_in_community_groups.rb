class ChangeDefaultValueForInactivatedInCommunityGroups < ActiveRecord::Migration[5.0]
  def change
    change_column_default :community_groups, :inactivate, false
  end
end
