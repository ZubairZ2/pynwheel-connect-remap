class AddLeasePricingFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :lease_pricing, :string
  end
end
