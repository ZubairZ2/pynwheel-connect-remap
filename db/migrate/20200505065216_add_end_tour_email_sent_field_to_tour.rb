class AddEndTourEmailSentFieldToTour < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :end_tour_email_sent, :boolean, default: false
    add_column :tours, :abandoned_tour_email_sent, :boolean, default: false
  end
end
