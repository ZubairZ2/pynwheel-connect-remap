class AddSchedulerTourFloorplanFields < ActiveRecord::Migration[7.2]
  def change
    add_column :floorplans, :scheduler_label, :string
    add_column :floorplans, :scheduler_url, :string
    add_column :units, :scheduler_label, :string
    add_column :units, :scheduler_url, :string
  end
end
