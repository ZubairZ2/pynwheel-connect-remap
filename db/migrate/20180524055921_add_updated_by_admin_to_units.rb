class AddUpdatedByAdminToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :updated_by_admin, :boolean,default: false
  end
end
