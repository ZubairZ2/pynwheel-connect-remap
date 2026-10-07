# One row per Detect Hallways submission. `client_request_id` (a UUID made in
# the browser) is the idempotency key: a replayed request returns the stored
# `result` instead of applying the run twice. `status` and `undone_at` back
# the server-side undo of a run's still-pending rows.
class CreateHallwayDetectionRuns < ActiveRecord::Migration[7.2]
  def change
    create_table :hallway_detection_runs do |t|
      t.integer :community_id, null: false
      t.string :parent_type, null: false
      t.integer :parent_id, null: false
      t.string :client_request_id, null: false
      # applied | undone
      t.string :status, null: false, default: 'applied'
      # plate | building | all
      t.string :scope
      # vector | inferred | autoconnect
      t.string :detector_source
      t.string :space, null: false, default: 'raster'
      t.integer :nodes_added, null: false, default: 0
      t.integer :edges_added, null: false, default: 0
      t.integer :nodes_skipped, null: false, default: 0
      t.integer :edges_skipped, null: false, default: 0
      # key_map + skipped, replayed on a duplicate request
      t.jsonb :result, null: false, default: {}
      t.integer :triggered_by_user_id
      t.datetime :undone_at
      t.timestamps
    end

    add_index :hallway_detection_runs, :client_request_id, unique: true
    add_index :hallway_detection_runs, %i[parent_type parent_id]
  end
end
