# Memory of a user's deletion. Hallway rows are hard-deleted (the legacy
# editor does the same); a tombstone with the deleted geometry lets Detect
# Hallways tell "the detector cannot see it any more" from "the user removed
# it", so a deleted path does not reappear on the next run.
class CreateHallwaySuppressions < ActiveRecord::Migration[7.2]
  def change
    create_table :hallway_suppressions do |t|
      t.string :parent_type, null: false
      t.integer :parent_id, null: false
      t.integer :community_id
      # node | edge
      t.string :kind, null: false
      t.string :space, null: false, default: 'raster'
      # node: the point; edge: endpoint A (storage units)
      t.float :x1, null: false
      t.float :y1, null: false
      # edge: endpoint B
      t.float :x2
      t.float :y2
      # edge between surviving nodes: the canonical pair (no FK; may dangle)
      t.integer :hallway_a_id
      t.integer :hallway_b_id
      t.string :removed_source
      t.string :removed_kind
      t.string :reason, null: false, default: 'user_delete'
      t.integer :removed_by_user_id
      t.datetime :created_at, null: false
    end

    add_index :hallway_suppressions, %i[parent_type parent_id kind]
  end
end
