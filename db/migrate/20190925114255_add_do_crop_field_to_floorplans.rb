class AddDoCropFieldToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :do_crop, :boolean, default: false
    add_column :floorplans, :do_crop_secondary, :boolean, default: false
    add_column :communities, :do_crop, :boolean, default: false
    add_column :communities, :do_crop_secondary, :boolean, default: false
  end
end
