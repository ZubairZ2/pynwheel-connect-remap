class AddMoreEventsTrackSessions < ActiveRecord::Migration[5.0]
  def change
    add_column :track_sessions, :virtual_tour_clicks, :integer, default: 0
    add_column :track_sessions, :unit_modal_buttons_clicks, :integer, default: 0
    add_column :track_sessions, :open_pricing_matrix_clicks, :integer, default: 0
    add_column :track_sessions, :hide_pricing_matrix_clicks, :integer, default: 0

    add_index :track_sessions, :virtual_tour_clicks
    add_index :track_sessions, :unit_modal_buttons_clicks
    add_index :track_sessions, :open_pricing_matrix_clicks
    add_index :track_sessions, :hide_pricing_matrix_clicks
  end
end
