class ChangeStopIdsTypeInAccessLogs < ActiveRecord::Migration[5.0]
  def up
    change_column :access_logs, :stop_ids, :string, array: true, default: []
  end

  def down
    change_column :access_logs, :stop_ids, :integer, array: true, default: []
  end
end
