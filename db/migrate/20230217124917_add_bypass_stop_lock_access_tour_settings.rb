class AddBypassStopLockAccessTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :bypass_stop_lock_access, :boolean, :default => true
  end
end
