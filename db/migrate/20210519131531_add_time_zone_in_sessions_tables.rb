class AddTimeZoneInSessionsTables < ActiveRecord::Migration[5.0]
  def change
  	add_column :track_sessions, :community_time_zone, :string, default: "UTC"
  	add_column :tour_histories, :community_time_zone, :string, default: "UTC"
  end
end
