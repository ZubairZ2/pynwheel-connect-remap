# Amenity interactions earn the same typed columns units and floor plans have.
#
# The SDK now resolves an amenity's id and name on every amenity event -- card,
# map marker, favourite -- and publishes both to a client's data layer. Kept in
# the `properties` blob they would be the one entity a report could not filter
# or group on without a JSONB traversal, which is exactly what the table's
# column rule exists to prevent: if a report reads it, it earns a column.
#
# Nullable, no default, no index. Adding a nullable column with no default is a
# catalog-only change in Postgres, so this takes no table rewrite. The existing
# community/action/time index already covers "amenity events for a property";
# an index on amenity_id can follow a report that actually needs one.
class AddAmenityDimensionsToSdkEvents < ActiveRecord::Migration[7.2]
  def change
    add_column :sdk_events, :amenity_id,   :integer
    add_column :sdk_events, :amenity_name, :string
  end
end
