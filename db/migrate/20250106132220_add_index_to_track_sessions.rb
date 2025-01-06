class AddIndexToTrackSessions < ActiveRecord::Migration[5.0]
  def change
    add_index :track_sessions, :community_id

    add_index :track_sessions, :amenity_marker_hovers
    add_index :track_sessions, :unit_marker_hovers

    add_index :track_sessions, :unit_marker_clicks
    add_index :track_sessions, :amenity_marker_clicks
    add_index :track_sessions, :sorting_filter_clicks
    add_index :track_sessions, :bedroom_filter_clicks
    add_index :track_sessions, :pricing_filter_clicks
    add_index :track_sessions, :square_feet_filter_clicks
    add_index :track_sessions, :availability_filter_clicks
    add_index :track_sessions, :reset_filter_clicks
    add_index :track_sessions, :view_saved_clicks
    add_index :track_sessions, :schedule_tour_clicks
    add_index :track_sessions, :logo_clicks
    add_index :track_sessions, :floor_number_clicks
    add_index :track_sessions, :zoom_in_clicks
    add_index :track_sessions, :zoom_out_clicks
    add_index :track_sessions, :zoom_refresh_clicks
    add_index :track_sessions, :clear_favorites_clicks

    add_column :track_sessions, :other_hovers, :integer, default: 0
    add_column :track_sessions, :other_clicks, :integer, default: 0

    add_index :track_sessions, :other_hovers
    add_index :track_sessions, :other_clicks
  end
end
