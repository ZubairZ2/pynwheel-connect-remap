class CreateWebHookLogs < ActiveRecord::Migration[5.0]
  def change
    create_table :web_hook_logs do |t|
      t.string :type
      t.string :community_name
      t.string :community_id
      t.jsonb :params

      t.timestamps
    end
  end
end