# Indexes for the lookups the wayfinding services make on every save and
# every graph build: a stop's rows by (type, id) and a floorplate's units.
# Built concurrently so a large production table is not locked.
class AddPlottingIndexes < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    add_index :tour_stops, %i[stop_type stop_id], algorithm: :concurrently, if_not_exists: true
    add_index :units, :floorplate_id, algorithm: :concurrently, if_not_exists: true
  end
end
