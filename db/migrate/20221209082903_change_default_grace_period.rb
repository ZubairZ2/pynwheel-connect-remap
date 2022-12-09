class ChangeDefaultGracePeriod < ActiveRecord::Migration[5.0]
  def change
    change_column :tours, :grace_period, :integer, :default => 10
  end
end
