class AddUpdatedByAdminToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :updated_by_admin, :boolean,default: false
  end
end
