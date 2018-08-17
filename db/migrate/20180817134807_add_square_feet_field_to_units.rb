class AddSquareFeetFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :square_feet, :float
  end
end
