class AddFileToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :file, :string
  end
end
