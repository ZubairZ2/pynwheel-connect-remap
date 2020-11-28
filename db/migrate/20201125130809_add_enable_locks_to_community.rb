class AddEnableLocksToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :enable_locks, :boolean, default: true
  end
end
