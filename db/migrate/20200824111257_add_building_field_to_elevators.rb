class AddBuildingFieldToElevators < ActiveRecord::Migration[5.0]
  def change
    add_column :elevators, :building, :string
  end
end
