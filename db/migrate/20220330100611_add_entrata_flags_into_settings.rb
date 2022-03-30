class AddEntrataFlagsIntoSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :entrata_available_units_only, :string, default: "0"
    add_column :credentials, :entrata_show_unit_spaces, :string, default: "1"
    add_column :credentials, :entrata_use_space_configuration, :string, default: "1"
  end
end
