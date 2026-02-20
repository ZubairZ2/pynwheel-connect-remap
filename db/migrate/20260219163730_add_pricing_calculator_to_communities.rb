class AddPricingCalculatorToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :enable_pricing_calculator, :boolean, default: false, null: false
    add_column :communities, :pricing_calculator_embed_code, :string
  end
end
