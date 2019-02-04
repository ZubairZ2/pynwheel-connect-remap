class AddRealpagePricingDataFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :realpage_pricing_data, :string
  end
end
