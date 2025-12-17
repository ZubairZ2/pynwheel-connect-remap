class AddEnableFloorplanColor < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :enable_floorplan_level_color, :boolean, default: false
  end
end