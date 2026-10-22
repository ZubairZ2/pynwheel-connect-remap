# frozen_string_literal: true

# Indexes for the visit recording columns, built concurrently so the live
# tables are never locked (as 20261018090000 did for tour_histories).
class AddVisitRecordingIndexes < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    add_index :tour_histories, :schedual_tour_id, algorithm: :concurrently, if_not_exists: true
    add_index :tour_histories, :client_visit_id, unique: true, where: 'client_visit_id IS NOT NULL', algorithm: :concurrently, if_not_exists: true
    add_index :visited_stops, :tour_history_id, algorithm: :concurrently, if_not_exists: true
    add_index :visited_stops, %i[tour_history_id client_event_id], unique: true, where: 'client_event_id IS NOT NULL', algorithm: :concurrently, if_not_exists: true,
                                                                   name: 'index_visited_stops_on_visit_and_client_event'
    add_index :lock_histories, %i[tour_history_id client_event_id], unique: true, where: 'client_event_id IS NOT NULL', algorithm: :concurrently, if_not_exists: true,
                                                                    name: 'index_lock_histories_on_visit_and_client_event'
    add_index :igloohome_guests, :tour_history_id, algorithm: :concurrently, if_not_exists: true
  end
end
