class AddVisitingAlertsToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :arrive_too_early_alert, :string
    add_column :communities, :arrive_too_late_alert, :string
  end
end
