class AddEnableSdkMapCacheToCommunities < ActiveRecord::Migration[7.1]
  def change
    add_column :communities, :enable_sdk_map_cache, :boolean, default: false, null: false
  end
end
