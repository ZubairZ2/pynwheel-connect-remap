class AddEnablePynwheelPricingCalculatorToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :enable_pynwheel_pricing_calculator, :boolean, default: false, null: false
  end
end
