class AddBillingRateTouchToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :billing_rate_touch, :string
    add_column :communities, :billing_rate_selftour, :string
    add_column :communities, :billing_rate_maps, :string
    remove_column :communities, :billing_rate
  end
end
