class AddStartingFloorFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :starting_floor, :integer
  end
end
