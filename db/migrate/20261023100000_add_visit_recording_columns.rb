# frozen_string_literal: true

# Visits recorded by the new Pynwheel Tour app (October 23, 2026): the
# legacy tables keep their meaning (Connect's Visitors module and the legacy
# pages read them unchanged); these columns link a visit to its booking,
# say which app wrote it, make the app's retries idempotent and record the
# instant of a stop event as one timestamp. Every column is nullable or
# defaulted so legacy rows read as before. Indexes: the next migration.
class AddVisitRecordingColumns < ActiveRecord::Migration[7.2]
  def change
    add_column :tour_histories, :schedual_tour_id, :integer
    add_column :tour_histories, :source, :string, default: 'legacy', null: false
    add_column :tour_histories, :client_visit_id, :uuid
    add_column :tour_histories, :ended_reason, :string
    add_column :tour_histories, :location_received, :boolean, default: false, null: false

    add_column :visited_stops, :kind, :string, default: 'arrived', null: false
    add_column :visited_stops, :occurred_at, :datetime, precision: nil
    add_column :visited_stops, :tour_history_id, :integer
    add_column :visited_stops, :client_event_id, :uuid
    add_column :visited_stops, :payload, :jsonb, default: {}, null: false

    add_column :lock_histories, :provider, :string
    add_column :lock_histories, :method, :string
    add_column :lock_histories, :success, :boolean
    add_column :lock_histories, :error_code, :string
    add_column :lock_histories, :client_event_id, :uuid

    add_column :igloohome_guests, :tour_history_id, :integer
    add_column :igloohome_guests, :issued_by_user_id, :integer
  end
end
