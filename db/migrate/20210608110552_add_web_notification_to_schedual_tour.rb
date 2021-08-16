class AddWebNotificationToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :confirmation_notification, :string
    add_column :schedual_tours, :reschedule_notification, :string
  end
end
