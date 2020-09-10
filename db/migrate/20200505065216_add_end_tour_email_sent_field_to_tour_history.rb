class AddEndTourEmailSentFieldToTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :end_tour_email_sent, :boolean, default: false
    add_column :tour_histories, :abandoned_tour_email_sent, :boolean, default: false
  end
end
