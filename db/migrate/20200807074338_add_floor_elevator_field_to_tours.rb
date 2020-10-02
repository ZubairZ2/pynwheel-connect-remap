class AddFloorElevatorFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :floor_elevator, :json, null: false, default: '{}'
  end
end
