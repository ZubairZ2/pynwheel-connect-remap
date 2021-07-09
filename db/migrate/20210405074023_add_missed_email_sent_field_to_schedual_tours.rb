class AddMissedEmailSentFieldToSchedualTours < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :missed_email_sent, :boolean, default: false
  end
end
