class ChangeBillingsDefualtValues < ActiveRecord::Migration[5.0]
  def change
    change_column :communities, :billing_rate_touch, :string, :default =>"$2,028"
    change_column :communities, :billing_rate_selftour, :string, :default =>"$385"
    change_column :communities, :billing_rate_maps,:string, :default =>"$50"
    change_column :communities, :lincoln_billing_rate,:string, :default => "$295"
    change_column :communities, :dwelo_billing_rate,:string, :default =>"$280"
  end
end
