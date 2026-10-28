# frozen_string_literal: true

# The compact presence state a Tour App visit keeps from the location samples
# the phone reports while the tour runs (October 28, 2026): the last fix that
# counted, how long the phone has been beyond the radius, when the property
# was told the visitor had departed, and when they came back. No sample is
# stored; the legacy `alerts_during_tour` kept none either.
class AddVisitPresenceColumns < ActiveRecord::Migration[7.2]
  def change
    add_column :tour_histories, :presence_state, :string
    add_column :tour_histories, :last_fix_at, :datetime
    add_column :tour_histories, :last_fix_distance_m, :integer
    add_column :tour_histories, :last_fix_accuracy_m, :integer
    add_column :tour_histories, :last_location_event_id, :uuid
    add_column :tour_histories, :outside_since, :datetime
    add_column :tour_histories, :outside_fix_count, :integer, default: 0, null: false
    add_column :tour_histories, :departed_notified_at, :datetime
    add_column :tour_histories, :returned_at, :datetime
  end
end
