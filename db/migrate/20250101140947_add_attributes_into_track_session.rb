class AddAttributesIntoTrackSession < ActiveRecord::Migration[5.0]
  def change
  	add_column :track_sessions, :unit_marker_hovers, :integer, default: 0
  	add_column :track_sessions, :unit_list_hovers, :integer, default: 0
  	add_column :track_sessions, :amenity_marker_hovers, :integer, default: 0
  end
end
