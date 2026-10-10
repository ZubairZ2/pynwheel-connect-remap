class AddHideMapUnitNumbersToCommunities < ActiveRecord::Migration[7.2]
  # Property-level opt-out for the unit number labels drawn into a 2D SVG map.
  # Wanted where units are plotted as transparent shapes: the shape is meant to
  # be invisible but its number still prints on the map. Only the labels go --
  # the unit shapes keep every hover, click and pop-up behaviour.
  #
  # Default false so every existing property keeps rendering its numbers.
  def up
    return if column_exists?(:communities, :hide_map_unit_numbers)

    add_column :communities, :hide_map_unit_numbers, :boolean, default: false

    # Backfills the rows that existed before the default was in place, then
    # enforces the invariant without taking a full-table validation lock.
    execute "UPDATE communities SET hide_map_unit_numbers = FALSE WHERE hide_map_unit_numbers IS NULL;"

    execute <<~SQL
      ALTER TABLE communities
        ADD CONSTRAINT communities_hide_map_unit_numbers_not_null
        CHECK (hide_map_unit_numbers IS NOT NULL)
        NOT VALID;
    SQL
  end

  def down
    execute "ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_hide_map_unit_numbers_not_null;"
    remove_column :communities, :hide_map_unit_numbers if column_exists?(:communities, :hide_map_unit_numbers)
  end
end
