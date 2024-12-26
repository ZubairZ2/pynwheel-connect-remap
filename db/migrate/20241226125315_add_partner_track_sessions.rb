class AddPartnerTrackSessions < ActiveRecord::Migration[5.0]
  def change
    add_column :track_sessions, :partner, :string
  end
end