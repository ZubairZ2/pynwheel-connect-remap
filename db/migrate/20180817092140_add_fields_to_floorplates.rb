class AddFieldsToFloorplates < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplates, :floor_name, :string
    add_column :floorplates, :floor_name_added, :boolean,default: false
  end
end
