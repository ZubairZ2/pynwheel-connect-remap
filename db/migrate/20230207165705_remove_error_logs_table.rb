class RemoveErrorLogsTable < ActiveRecord::Migration[5.0]
  def up
    drop_table :error_logs, if_exists: true
  end

  def down
    create_table :error_logs, if_exists: false
  end
end
