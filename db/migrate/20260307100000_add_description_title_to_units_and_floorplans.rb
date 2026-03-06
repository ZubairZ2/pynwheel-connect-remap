class AddDescriptionTitleToUnitsAndFloorplans < ActiveRecord::Migration[6.1]
  def change
    add_column :units,      :description_title, :string, default: "More Details"
    add_column :floorplans, :description_title, :string, default: "More Details"
  end
end
