class AddFloorplanAmenityIdToAmenity < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :floorplan_amenity_id, :integer
  end
end