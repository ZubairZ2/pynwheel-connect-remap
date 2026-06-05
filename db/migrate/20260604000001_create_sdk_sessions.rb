class CreateSdkSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :sdk_sessions do |t|
      t.integer  :community_id,                null: false
      t.string   :client_type,                 null: false
      t.string   :session_id,                  null: false
      t.string   :partner
      t.string   :sdk_version,                 default: "v1"
      t.string   :community_time_zone,         default: "UTC"
      t.datetime :start_datetime
      t.datetime :end_datetime
      t.integer  :map_interactions,            default: 0, null: false
      t.datetime :map_interactions_last_active
      t.string   :visited_pages,               array: true, default: []
      t.jsonb    :events,                      default: {}, null: false
      t.jsonb    :device_context,              default: {}, null: false
      t.timestamps
    end

    add_index :sdk_sessions, [:community_id, :client_type, :start_datetime], name: "idx_sdk_sessions_community_type_date"
    add_index :sdk_sessions, [:session_id, :community_id], unique: true,     name: "idx_sdk_sessions_session_community"
    add_index :sdk_sessions, [:partner, :start_datetime],                    name: "idx_sdk_sessions_partner_date"
    add_index :sdk_sessions, :events,         using: :gin,                   name: "idx_sdk_sessions_events_gin"
    add_index :sdk_sessions, :device_context, using: :gin,                   name: "idx_sdk_sessions_device_context_gin"
  end
end
