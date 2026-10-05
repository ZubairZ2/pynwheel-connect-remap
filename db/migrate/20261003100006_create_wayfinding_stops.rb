# Physical self-tour stops the legacy tables have no home for: an extra
# entry, an exit, a blocker, a leasing office, a restroom, mail & packages,
# parking access, a waypoint. Elevators, stairs and ramps stay in
# `elevators` (with a `kind`), building entry gates in
# `building_starting_points`, door/gate stops in `doors`; units and
# amenities stay what they are. Tour membership is not stored here (phase 1
# writes no new `tour_stops.stop_type`).
class CreateWayfindingStops < ActiveRecord::Migration[7.2]
  def change
    create_table :wayfinding_stops do |t|
      t.integer :community_id, null: false
      # Floorplate | Sitemap (as hallways.parent_type)
      t.string :map_type, null: false
      t.integer :map_id, null: false
      # entry | exit | blocker | leasing | restroom | mail | parking | waypoint
      t.string :kind, null: false
      t.string :name, null: false
      t.string :building
      # "floor only" on a stacked plate; nil = every floor
      t.integer :floor
      # The marker's centre in floor-image pixels; nil = unplaced ("To Plot")
      t.float :x_plot
      t.float :y_plot
      t.string :space, null: false, default: 'raster'
      t.boolean :accessible, null: false, default: true
      t.string :lock_provider, null: false, default: ''
      t.string :access_code
      # visitor instruction
      t.text :note
      # blockers only; nil = the default radius
      t.float :radius_px
      # explicit link; nil = nearest-point rule
      t.integer :hallway_id
      # active | archived
      t.string :status, null: false, default: 'active'
      # manual | detected | imported
      t.string :source, null: false, default: 'manual'
      t.integer :created_by_user_id
      t.timestamps
    end

    add_index :wayfinding_stops, :community_id
    add_index :wayfinding_stops, %i[map_type map_id]
    add_index :wayfinding_stops, %i[community_id kind]
    add_foreign_key :wayfinding_stops, :hallways, column: :hallway_id, on_delete: :nullify
  end
end
