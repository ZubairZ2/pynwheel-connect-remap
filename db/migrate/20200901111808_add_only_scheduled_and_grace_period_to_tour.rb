class AddOnlyScheduledAndGracePeriodToTour < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :only_scheduled_tour, :boolean, default: false
    add_column :tours, :grace_period, :integer, default: 5
  end
end
