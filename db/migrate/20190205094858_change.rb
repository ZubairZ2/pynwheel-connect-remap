class Change < ActiveRecord::Migration[5.0]
  def change
    change_column :communities, :realpage_pricing_data_uploaded, :boolean, :default => true
  end
end
