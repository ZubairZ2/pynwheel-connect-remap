class AddUnscheduledAlertWithWidgetToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :unscheduled_alert_with_widget, :string
  end
end
