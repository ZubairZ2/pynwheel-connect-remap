class AddUnscheduledAlertToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :unscheduled_alert, :string
  end
end
