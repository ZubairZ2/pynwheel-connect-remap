class AddFollowUpEmailSentDate < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :follow_up_email_date, :date
  end
end
