class UpdateDefaultBillingRates < ActiveRecord::Migration[7.2]
  def change
    change_column_default :communities, :billing_rate_touch, "$2628"
    change_column_default :communities, :billing_rate_maps, "$29"
  end
end