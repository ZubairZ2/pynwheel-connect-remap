# Which hallway node a stop joins the graph at. Without a row the routing
# rule is the legacy one (the nearest hallway point, `ShortestPath`); an
# `explicit` row names the node chosen in Connect; a `detached` row says the
# stop joins nothing until it is linked again. `anchor_x/anchor_y` keep the
# join point given by hand to a record that has no position on the layer
# (a unit plotted only on the floor SVG while wayfinding runs on the image).
class CreateHallwayAttachments < ActiveRecord::Migration[7.2]
  def change
    create_table :hallway_attachments do |t|
      # Unit | Amenity | Door | Elevator | BuildingStartingPoint | Tour | WayfindingStop
      t.string :attachable_type, null: false
      t.integer :attachable_id, null: false
      t.string :parent_type, null: false
      t.integer :parent_id, null: false
      t.integer :community_id
      t.integer :hallway_id
      # explicit | detached
      t.string :mode, null: false, default: 'explicit'
      t.float :anchor_x
      t.float :anchor_y
      t.string :space, null: false, default: 'raster'
      t.integer :created_by_user_id
      t.timestamps
    end

    add_index :hallway_attachments, %i[attachable_type attachable_id parent_type parent_id], unique: true, name: 'index_hallway_attachments_unique_per_level'
    add_index :hallway_attachments, %i[parent_type parent_id]
    add_index :hallway_attachments, :hallway_id
    add_foreign_key :hallway_attachments, :hallways, column: :hallway_id, on_delete: :cascade
    add_check_constraint :hallway_attachments,
                         "(mode = 'detached' AND hallway_id IS NULL) OR (mode = 'explicit' AND hallway_id IS NOT NULL)",
                         name: 'hallway_attachments_mode_consistency'
  end
end
