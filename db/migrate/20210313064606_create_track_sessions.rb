class CreateTrackSessions < ActiveRecord::Migration[5.0]
  def change
    create_table :track_sessions do |t|

      t.datetime :start_datetime
      t.datetime :end_datetime
      t.string :track_session_type, default: ""
      t.integer :community_id
      t.string :session_id, default: ""
      t.string :visited_pages, array: true, default: []
      t.integer :apply_click_counter, :default => 0
      t.integer :favorite_saved_counter, :default => 0
      t.integer :favorite_sent_counter, :default => 0
      t.integer :price_opened_counter, :default => 0
      
      t.timestamps
    end
  end
end
