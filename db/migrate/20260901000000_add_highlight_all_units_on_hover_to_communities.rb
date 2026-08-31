class AddHighlightAllUnitsOnHoverToCommunities < ActiveRecord::Migration[7.2]
  # Property-level opt-in for group hover on the map: hovering any unit lights
  # up every unit sharing its floor plan instead of only the unit under the
  # cursor. Written for properties that plot one tenant/company per floor plan
  # across several units, but it is a plain property setting -- nothing about it
  # is specific to one property.
  #
  # Default false so every existing property keeps today's single-unit hover.
  def up
    return if column_exists?(:communities, :highlight_all_units_on_hover)

    add_column :communities, :highlight_all_units_on_hover, :boolean, default: false

    # Backfills the rows that existed before the default was in place, then
    # enforces the invariant without taking a full-table validation lock.
    execute "UPDATE communities SET highlight_all_units_on_hover = FALSE WHERE highlight_all_units_on_hover IS NULL;"

    execute <<~SQL
      ALTER TABLE communities
        ADD CONSTRAINT communities_highlight_all_units_on_hover_not_null
        CHECK (highlight_all_units_on_hover IS NOT NULL)
        NOT VALID;
    SQL
  end

  def down
    execute "ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_highlight_all_units_on_hover_not_null;"
    remove_column :communities, :highlight_all_units_on_hover if column_exists?(:communities, :highlight_all_units_on_hover)
  end
end
