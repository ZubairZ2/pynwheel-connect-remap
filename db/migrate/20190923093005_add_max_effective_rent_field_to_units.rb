class AddMaxEffectiveRentFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :max_effective_rent, :float
    add_column :units, :min_effective_rent, :float
    add_column :units, :avg_effective_rent, :float
  end
end
