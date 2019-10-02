class CreateAlertMessages < ActiveRecord::Migration[5.0]
  def change
    create_table :alert_messages do |t|
      t.string :message_key
      t.string :message_body

      t.timestamps
    end
  end
end
