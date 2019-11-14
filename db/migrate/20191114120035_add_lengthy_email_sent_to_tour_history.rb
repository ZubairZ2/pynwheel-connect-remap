class AddLengthyEmailSentToTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :lengthy_stay_email_sent, :boolean, default: false
  end
end
