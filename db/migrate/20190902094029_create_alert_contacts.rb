class CreateAlertContacts < ActiveRecord::Migration[5.0]
  def change
    create_table :alert_contacts do |t|
      t.string :email
      t.string :phone
      t.boolean :active

      t.timestamps
    end
  end
end
