class CreateSdkSessions < ActiveRecord::Migration[7.2]
  def change
    create_table :sdk_sessions do |t|
      t.integer  :community_id,                 null: false
      t.string   :client_type,                  null: false
      t.string   :session_id,                   null: false   # analytics segment UUID (rotates on idle)
      t.string   :parent_sdk_session_id                       # stable localStorage UUID (user identity)
      t.string   :partner
      t.string   :product,                      default: "web", null: false
      t.string   :sdk_version,                  default: "v1"
      t.string   :community_time_zone,          default: "UTC"
      t.datetime :start_datetime
      t.datetime :end_datetime
      t.integer  :map_interactions,             default: 0, null: false
      t.datetime :map_interactions_last_active
      t.string   :visited_pages,                array: true, default: []
      t.jsonb    :events,                       default: {}, null: false
      t.jsonb    :device_context,               default: {}, null: false
      t.jsonb    :full_event,                   default: {}, null: false
      t.timestamps
    end

    # Segment lookup — non-unique because the same stable sdk_session_id user
    # can produce multiple segment rows (one per activity window after idle rotation).
    add_index :sdk_sessions, [:session_id, :community_id, :start_datetime],
              name: "idx_sdk_sessions_session_community_date"

    # Journey-level queries: all segments belonging to one user across time.
    add_index :sdk_sessions, [:parent_sdk_session_id, :start_datetime],
              name: "idx_sdk_sessions_parent_date"

    add_index :sdk_sessions, [:community_id, :client_type, :start_datetime],
              name: "idx_sdk_sessions_community_type_date"

    add_index :sdk_sessions, [:partner, :start_datetime],
              name: "idx_sdk_sessions_partner_date"

    add_index :sdk_sessions, :events,         using: :gin, name: "idx_sdk_sessions_events_gin"
    add_index :sdk_sessions, :device_context, using: :gin, name: "idx_sdk_sessions_device_context_gin"
    add_index :sdk_sessions, :full_event,     using: :gin, name: "idx_sdk_sessions_full_event_gin"
  end
end
