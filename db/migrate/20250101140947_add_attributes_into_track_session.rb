class AddAttributesIntoTrackSession < ActiveRecord::Migration[5.0]
  def change
    add_column :track_sessions, :amenity_marker_hovers, :integer, default: 0
    add_column :track_sessions, :unit_marker_hovers, :integer, default: 0
    add_column :track_sessions, :unit_marker_clicks, :integer, default: 0
    add_column :track_sessions, :amenity_marker_clicks, :integer, default: 0
    add_column :track_sessions, :sorting_filter_clicks, :integer, default: 0
    add_column :track_sessions, :bedroom_filter_clicks, :integer, default: 0
    add_column :track_sessions, :pricing_filter_clicks, :integer, default: 0
    add_column :track_sessions, :square_feet_filter_clicks, :integer, default: 0
    add_column :track_sessions, :availability_filter_clicks, :integer, default: 0
    add_column :track_sessions, :reset_filter_clicks, :integer, default: 0
    add_column :track_sessions, :view_saved_clicks, :integer, default: 0
    add_column :track_sessions, :schedule_tour_clicks, :integer, default: 0
    add_column :track_sessions, :logo_clicks, :integer, default: 0
    add_column :track_sessions, :floor_number_clicks, :integer, default: 0
    add_column :track_sessions, :zoom_in_clicks, :integer, default: 0
    add_column :track_sessions, :zoom_out_clicks, :integer, default: 0
    add_column :track_sessions, :zoom_refresh_clicks, :integer, default: 0
    add_column :track_sessions, :clear_favorites_clicks, :integer, default: 0
  end
end
