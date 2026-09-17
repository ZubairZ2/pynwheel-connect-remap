# Append-only fact table for map interactions that carry business meaning.
#
# Why a table when `sdk_sessions` already stores analytics:
#
#   1. `sdk_sessions.events` is a counter bag. Every event's metadata is merged
#      into one flat hash per session, so `unit_id` from a marker hover and
#      `unit_id` from an Apply Now click overwrite each other. Per-event
#      dimensions cannot survive there, and PYN-1655 needs 18 of them, resolved
#      at click time, on every single event.
#   2. `sdk_sessions.full_event` did try to keep raw events, by appending to a
#      JSONB blob. Every five-second flush re-read that blob, appended, and
#      rewrote the whole column -- plus its GIN index -- so a long session paid
#      O(n^2) write amplification. Nothing in app/ or lib/ ever read it back.
#      This table replaces it: one INSERT per flush, no read, no rewrite.
#   3. The weekly per-property digest (the fast-follow behind the data layer)
#      aggregates by property, action and day. That is a range scan over a
#      narrow table, not a JSONB traversal of every session row in the window.
#
# Not every event lands here. Hover and lifecycle events stay as session
# counters, where they already are -- a marker hover fires constantly and its
# only consumer is a count. Analytics::MapEventContract decides what is durable
# enough to earn a row; changing that decision is a one-line edit there.
#
# Columns, not JSONB, for the dimensions the digest and the client-facing schema
# both name. `properties` holds the long tail so a new metadata field needs no
# migration -- the same rule unit_space_details.metadata follows: if a report
# reads it, it earns a column; if only an audit reads it, it lives in the blob.
class CreateSdkEvents < ActiveRecord::Migration[7.2]
  def change
    create_table :sdk_events do |t|
      # ── Identity ────────────────────────────────────────────────────────────
      # The session row this event belongs to. No FK: sdk_sessions rows are
      # created lazily by the same batch that writes these, and an analytics
      # insert must never fail a request because of a race on the parent.
      t.bigint  :sdk_session_id
      # The rotating analytics segment UUID, denormalised so a batch can be
      # traced without joining, and so events survive a session row being pruned.
      t.string  :session_id, null: false
      # The stable localStorage identity UUID. Joins a visitor's segments into
      # one journey across days and devices.
      t.string  :parent_sdk_session_id

      # ── Scope ───────────────────────────────────────────────────────────────
      t.integer :community_id, null: false
      # Denormalised from communities.company_id. The digest groups by company
      # and the client-facing payload sends it as a dimension; both would
      # otherwise join every read of this table to communities.
      t.integer :company_id
      t.string  :client_type, null: false
      t.string  :partner
      t.string  :product
      t.string  :sdk_version

      # ── What happened ───────────────────────────────────────────────────────
      # `name` is Pynwheel's internal event name ("apply_now"). `action` is the
      # client-facing GA action ("apply_clicked"). Two fields because the two
      # vocabularies version independently: we can rename an internal event
      # without breaking a client's GTM trigger, and expose a new action for an
      # event we already track without touching the SDK.
      t.string  :name, null: false
      t.string  :action
      t.string  :event_type, null: false, default: "click"

      # When the interaction happened, anchored to server time and corrected for
      # the batch's client-clock offset -- see MapEventContract#occurred_at_for.
      # Never the raw client timestamp: a device with a wrong clock would
      # otherwise drop events outside every reporting window.
      t.datetime :occurred_at, null: false

      # ── Context ─────────────────────────────────────────────────────────────
      # The host page the iframe was embedded in, not our own URL. Captured from
      # the parent frame when the embedder allows it, else the referrer.
      t.text    :page_url

      # ── Unit dimensions ─────────────────────────────────────────────────────
      t.integer :unit_id                # Pynwheel's own units.id
      t.string  :provider_unit_id       # units.provider_unit_id -- the PMS's id
      t.string  :unit_name
      t.string  :building
      t.integer :floor_level

      # ── Floor plan dimensions ───────────────────────────────────────────────
      t.integer :floorplan_id           # Pynwheel's own floorplans.id
      t.string  :provider_floorplan_id  # floorplans.provider_floorplan_id
      t.string  :floorplan_name
      t.decimal :bedrooms,  precision: 4, scale: 1
      t.decimal :bathrooms, precision: 4, scale: 1
      t.integer :square_footage

      # ── CTA dimensions ──────────────────────────────────────────────────────
      # Resolved at the moment of the click, so a label the CMS changes next week
      # does not rewrite what last week's visitors actually saw.
      t.string  :link_label
      t.text    :link_url
      # Which of the three configurable link slots this was (1, 2, 3). Stable
      # even when an earlier slot is blank -- see SdkPayloadBuilderService's
      # link builders, where the slot used to be lost to a compacting select.
      t.integer :link_index

      # ── Long tail ───────────────────────────────────────────────────────────
      t.jsonb   :properties, null: false, default: {}

      t.datetime :created_at, null: false
    end

    # The digest query and every per-property report: one property, one action,
    # a date range.
    add_index :sdk_events, %i[community_id action occurred_at],
              name: "idx_sdk_events_community_action_time"
    # The same scan without an action filter (session replay, funnel building).
    add_index :sdk_events, %i[community_id occurred_at],
              name: "idx_sdk_events_community_time"
    # Company-wide rollups, which the digest needs for multi-property clients.
    add_index :sdk_events, %i[company_id occurred_at],
              name: "idx_sdk_events_company_time"
    # Pulling one session's events back in order.
    add_index :sdk_events, %i[sdk_session_id occurred_at],
              name: "idx_sdk_events_session_time"
    # A visitor's whole journey across rotated segments.
    add_index :sdk_events, %i[parent_sdk_session_id occurred_at],
              name: "idx_sdk_events_visitor_time"

    # BRIN, not btree, for the bare time scan. Rows arrive in occurred_at order,
    # which is exactly the correlation BRIN needs, and it costs a few KB against
    # a btree's gigabytes on a table that only ever grows. Retention sweeps and
    # date-bounded exports use it; nothing else needs a time-only index.
    add_index :sdk_events, :occurred_at,
              using: :brin, name: "idx_sdk_events_time_brin"

    # Deliberately no GIN index on `properties`. It is the long tail, read by
    # audits rather than reports, and a GIN index is the write cost this table
    # was created to escape. Add one when a report actually filters on it.
  end
end
