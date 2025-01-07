class AddInteractionsIntoTrackSessions < ActiveRecord::Migration[5.0]
  def change
    add_column :track_sessions, :map_interactions, :integer, default: 1
    add_column :track_sessions, :map_interactions_last_active, :datetime
    add_index :track_sessions, :map_interactions
  end
end
