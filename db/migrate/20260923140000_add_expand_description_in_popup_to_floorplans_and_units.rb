class AddExpandDescriptionInPopupToFloorplansAndUnits < ActiveRecord::Migration[7.2]
  # The CMS "Expand details in pop-ups" toggle: the map opens the Details body
  # already expanded, with no accordion chevron, in floor plan and unit pop-ups.
  # Default false so every existing property keeps its collapsible Details on
  # release -- an editor opts in per floor plan or per unit from its detail page.
  TABLES = %i[floorplans units].freeze

  def up
    TABLES.each do |table|
      next if column_exists?(table, :expand_description_in_popup)

      add_column table, :expand_description_in_popup, :boolean, default: false

      # Backfills the rows that existed before the default was in place, then
      # enforces the invariant without taking a full-table validation lock.
      execute "UPDATE #{table} SET expand_description_in_popup = FALSE WHERE expand_description_in_popup IS NULL;"

      execute <<~SQL
        ALTER TABLE #{table}
          ADD CONSTRAINT #{table}_expand_description_in_popup_not_null
          CHECK (expand_description_in_popup IS NOT NULL)
          NOT VALID;
      SQL
    end
  end

  def down
    TABLES.each do |table|
      execute "ALTER TABLE #{table} DROP CONSTRAINT IF EXISTS #{table}_expand_description_in_popup_not_null;"
      remove_column table, :expand_description_in_popup if column_exists?(table, :expand_description_in_popup)
    end
  end
end
