class AddFloorplateCoveringRangeToElevator < ActiveRecord::Migration[5.0]
  def change
    add_column :elevators, :floorplate_covering_range, :string
  end
end
