class AddShowOnMapIsUpdatedToUnits < ActiveRecord::Migration[7.2]
  # "Set by hand" marker for the Map column, like the other *_is_updated flags:
  # once an editor sets show_on_map from the CMS, the provider syncs stop
  # overwriting it on every run.
  def change
    add_column :units, :show_on_map_is_updated, :boolean unless column_exists?(:units, :show_on_map_is_updated)
  end
end
