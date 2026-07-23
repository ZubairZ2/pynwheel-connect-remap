class AddDescriptionTitleToUnitsAndFloorplans < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def up
    unless column_exists?(:units, :description_title)
      add_column :units, :description_title, :string, default: "More Details"
    end
    unless column_exists?(:floorplans, :description_title)
      add_column :floorplans, :description_title, :string, default: "More Details"
    end
  end

  def down
    remove_column :units,      :description_title if column_exists?(:units,      :description_title)
    remove_column :floorplans, :description_title if column_exists?(:floorplans, :description_title)
  end
end
