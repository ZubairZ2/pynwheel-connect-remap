class AddAmenityAndFloorplanIdsToFavorites < ActiveRecord::Migration[7.2]
  def change
    add_column :favorites, :amenity_ids,   :jsonb, default: []
    add_column :favorites, :floorplan_ids, :jsonb, default: []
  end
end
