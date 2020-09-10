class AddModelUnitFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :modal_unit, :boolean, default: false
  end
end
