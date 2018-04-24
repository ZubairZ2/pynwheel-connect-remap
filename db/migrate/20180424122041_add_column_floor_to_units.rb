class AddColumnFloorToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :floor, :integer
  end
end
