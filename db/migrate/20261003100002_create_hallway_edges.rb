# Per-edge identity for the hallway graph. The adjacency itself stays in
# `hallways.next_points` (what every legacy reader and the routing engine
# walk); this table carries what an adjacency cannot: a polyline between two
# nodes, the edge's kind (hand-drawn, traced, inferred, bridge, auto-connect),
# its review state and the detection run that proposed it.
#
# Ownership rule: a confirmed row is mirrored into `next_points` on exactly
# one side; a pending row never is; an adjacency with no row is a legacy
# straight edge. Rows are keyed by the canonical pair `from < to`, and the
# foreign keys cascade so a node deleted by the legacy editor takes its rows
# with it.
class CreateHallwayEdges < ActiveRecord::Migration[7.2]
  def change
    create_table :hallway_edges do |t|
      # `hallways.id` is an integer serial, so the FK columns are integers.
      t.integer :from_hallway_id, null: false
      t.integer :to_hallway_id, null: false
      t.string :parent_type, null: false
      t.integer :parent_id, null: false
      t.integer :community_id
      t.string :kind, null: false, default: 'manual'
      # Interior points of the polyline from `from` towards `to`, in the
      # edge's `space`; [] is a straight line.
      t.jsonb :path_points, null: false, default: []
      t.string :review_status, null: false, default: 'confirmed'
      t.boolean :auto_generated, null: false, default: false
      t.bigint :detection_run_id
      t.string :space, null: false, default: 'raster'
      t.integer :created_by_user_id
      t.timestamps
    end

    add_index :hallway_edges, %i[from_hallway_id to_hallway_id], unique: true
    add_index :hallway_edges, :to_hallway_id
    add_index :hallway_edges, %i[parent_type parent_id]
    add_index :hallway_edges, :detection_run_id
    add_foreign_key :hallway_edges, :hallways, column: :from_hallway_id, on_delete: :cascade
    add_foreign_key :hallway_edges, :hallways, column: :to_hallway_id, on_delete: :cascade
    add_check_constraint :hallway_edges, 'from_hallway_id < to_hallway_id', name: 'hallway_edges_canonical_pair'
  end
end
