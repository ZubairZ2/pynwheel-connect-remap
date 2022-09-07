class FixWebHookLogsColumnname < ActiveRecord::Migration[5.0]
  def change
    rename_column :web_hook_logs, :type, :webhook_type
  end
end
