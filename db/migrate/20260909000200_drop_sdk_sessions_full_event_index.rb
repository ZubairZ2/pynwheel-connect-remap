# Drops the GIN index on sdk_sessions.full_event.
#
# `full_event` accumulated every raw event of a session into one JSONB blob,
# appended to on each five-second flush. Because Postgres rewrites a row's whole
# TOASTed value on update, a session's Nth flush rewrote all N-1 earlier events
# and re-indexed the result. That was the dominant write cost of the analytics
# endpoint, and it grew with session length.
#
# Nothing read the column. A grep across app/ and lib/ finds no reader -- not the
# analytics dashboards, not the reports, not the partner export. SdkEvent now
# holds the same data in queryable columns, written with one INSERT and never
# updated.
#
# This migration drops only the index, which is the write cost. The column keeps
# its historical data and stops being written by Analytics::SdkAnalyticsService.
# A later migration can drop the column itself once the retained history has been
# exported or aged out; doing both at once would make this irreversible.
class DropSdkSessionsFullEventIndex < ActiveRecord::Migration[7.2]
  # CONCURRENTLY cannot run inside a transaction. Without it, dropping the index
  # takes an ACCESS EXCLUSIVE lock on sdk_sessions and blocks every in-flight
  # analytics flush for the duration.
  disable_ddl_transaction!

  def up
    return unless index_exists?(:sdk_sessions, :full_event, name: "idx_sdk_sessions_full_event_gin")

    remove_index :sdk_sessions, name: "idx_sdk_sessions_full_event_gin", algorithm: :concurrently
  end

  def down
    return if index_exists?(:sdk_sessions, :full_event, name: "idx_sdk_sessions_full_event_gin")

    add_index :sdk_sessions, :full_event,
              using: :gin, name: "idx_sdk_sessions_full_event_gin", algorithm: :concurrently
  end
end
