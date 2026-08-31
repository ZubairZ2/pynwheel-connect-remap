class AddShowDescriptionOnCardToFloorplans < ActiveRecord::Migration[7.2]
  # Surfaces the floor plan's Details body on the right-rail card, not just
  # inside the pop-up. Default false so no existing property changes appearance
  # on release -- an editor opts in per floor plan from the detail page.
  def up
    return if column_exists?(:floorplans, :show_description_on_card)

    add_column :floorplans, :show_description_on_card, :boolean, default: false

    # Backfills the rows that existed before the default was in place, then
    # enforces the invariant without taking a full-table validation lock.
    execute "UPDATE floorplans SET show_description_on_card = FALSE WHERE show_description_on_card IS NULL;"

    execute <<~SQL
      ALTER TABLE floorplans
        ADD CONSTRAINT floorplans_show_description_on_card_not_null
        CHECK (show_description_on_card IS NOT NULL)
        NOT VALID;
    SQL
  end

  def down
    execute "ALTER TABLE floorplans DROP CONSTRAINT IF EXISTS floorplans_show_description_on_card_not_null;"
    remove_column :floorplans, :show_description_on_card if column_exists?(:floorplans, :show_description_on_card)
  end
end
