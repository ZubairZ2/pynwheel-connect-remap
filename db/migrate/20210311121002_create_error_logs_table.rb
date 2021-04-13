class CreateErrorLogsTable < ActiveRecord::Migration[5.0]
  def change
    create_table :error_logs do |t|
      t.text "error_location"
      t.string "status"
      t.text "description"
      t.text "message"
      t.timestamps
    end
  end
end
