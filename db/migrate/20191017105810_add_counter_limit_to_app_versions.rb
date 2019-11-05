class AddCounterLimitToAppVersions < ActiveRecord::Migration[5.0]
  def change
    add_column :app_versions, :counter_limit, :integer, default: 500
  end
end
