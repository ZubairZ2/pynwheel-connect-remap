class AddBuildingFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :building, :string
  end
end
