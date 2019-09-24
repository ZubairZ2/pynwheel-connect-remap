class AddCommunityIdToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :community_id, :integer
  end
end
