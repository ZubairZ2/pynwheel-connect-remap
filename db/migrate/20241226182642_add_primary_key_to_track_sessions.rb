class AddPrimaryKeyToTrackSessions < ActiveRecord::Migration[5.0]
  def change
    execute "ALTER TABLE track_sessions ADD PRIMARY KEY (id);"
  end
end