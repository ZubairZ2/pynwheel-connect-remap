class AddBillingTypeFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :billing_type, :string, default: "annual"
    add_column :communities, :billing_month, :string, default: ""
    add_column :communities, :billing_rate, :decimal
    add_column :communities, :date_installed, :date
    add_column :communities, :date_activated, :date
    add_column :communities, :date_inactivated, :date
  end
end
