class AddLincolnBillingRateToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :lincoln_billing_rate, :string
    add_column :communities, :dwelo_billing_rate, :string

  end
end
