class AddBillingRateForBothToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :billing_rate_for_both, :string, :default =>"$2413"
  end
end
