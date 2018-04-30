class AddCommunityIdToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :community_id, :integer
  end
end
