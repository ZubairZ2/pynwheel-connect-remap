class AddEnableSdkMapToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :enable_sdk_map, :boolean, default: false
  end
end
