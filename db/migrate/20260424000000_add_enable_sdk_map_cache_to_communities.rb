class AddEnableSdkMapCacheToCommunities < ActiveRecord::Migration[7.1]
  CONSTRAINT_NAME = "communities_enable_sdk_map_cache_not_null"

  def up
    add_column :communities, :enable_sdk_map_cache, :boolean, default: false unless column_exists?(:communities, :enable_sdk_map_cache)

    unless constraint_exists?
      execute <<~SQL
        ALTER TABLE communities
          ADD CONSTRAINT #{CONSTRAINT_NAME}
          CHECK (enable_sdk_map_cache IS NOT NULL)
          NOT VALID;
      SQL
    end
  end

  def down
    execute "ALTER TABLE communities DROP CONSTRAINT IF EXISTS #{CONSTRAINT_NAME};"
    remove_column :communities, :enable_sdk_map_cache if column_exists?(:communities, :enable_sdk_map_cache)
  end

  private

  def constraint_exists?
    ActiveRecord::Base.connection.execute(
      "SELECT 1 FROM pg_constraint WHERE conname = '#{CONSTRAINT_NAME}' LIMIT 1"
    ).any?
  end
end
