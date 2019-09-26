class AddHourlyEmailDailyEmailStatusToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :hourly_email_sent, :boolean, default: false
    add_column :schedual_tours, :daily_email_sent, :boolean, default: false
  end
end
