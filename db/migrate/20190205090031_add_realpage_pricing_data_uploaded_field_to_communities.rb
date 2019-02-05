class AddRealpagePricingDataUploadedFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :realpage_pricing_data_uploaded, :boolean, default: false
  end
end
