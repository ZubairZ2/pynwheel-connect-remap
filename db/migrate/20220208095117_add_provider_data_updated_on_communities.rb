class AddProviderDataUpdatedOnCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :provider_data_updated_on, :string
  end
end
