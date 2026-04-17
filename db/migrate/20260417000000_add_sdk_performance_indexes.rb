class AddSdkPerformanceIndexes < ActiveRecord::Migration[7.0]
  def change
    add_index :units,      :community_id,              if_not_exists: true
    add_index :units,      :floorplan_id,              if_not_exists: true
    add_index :floorplans, :community_id,              if_not_exists: true
    add_index :floorplates, :community_id,             if_not_exists: true
    add_index :amenities,  :community_id,              if_not_exists: true
    add_index :favorites,  [:session_id, :community_id], unique: true, if_not_exists: true
  end
end
