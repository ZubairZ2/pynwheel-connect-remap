class ChangeColumnNameInFloorplans < ActiveRecord::Migration[5.0]
  def change
  	rename_column :floorplans, :file_url, :availability_url
  end
end
