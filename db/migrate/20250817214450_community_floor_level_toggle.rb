class CommunityFloorLevelToggle < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :is_floor_level_map, :boolean, default: false
  end
end
