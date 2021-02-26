class AddArrivalEmailSentFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :arrival_email_sent, :boolean, default: false
  end
end
