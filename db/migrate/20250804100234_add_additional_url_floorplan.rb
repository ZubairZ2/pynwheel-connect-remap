class AddAdditionalUrlFloorplan < ActiveRecord::Migration[7.2]
  def change
    add_column :floorplans, :additional_button, :string
    add_column :floorplans, :additional_url, :string
  end
end
