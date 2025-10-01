class AddOpenNewTabToggles < ActiveRecord::Migration[7.2]
  def change
    add_column :floorplans, :link1_open_new_tab, :boolean, default: false
    add_column :floorplans, :link2_open_new_tab, :boolean, default: false
    add_column :floorplans, :link3_open_new_tab, :boolean, default: false

    add_column :units, :link1_open_new_tab, :boolean, default: false
    add_column :units, :link2_open_new_tab, :boolean, default: false
    add_column :units, :link3_open_new_tab, :boolean, default: false
  end
end