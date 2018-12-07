class AddColumn3dTourToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :virtual_tour_url, :string
  end
end
