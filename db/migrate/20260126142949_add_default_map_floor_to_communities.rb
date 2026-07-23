class AddDefaultMapFloorToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :default_map_floor, :integer
  end
end
