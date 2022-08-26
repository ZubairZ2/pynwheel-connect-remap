class AddFileToFloorplates < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplates, :file, :string
  end
end
