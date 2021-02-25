class BreezwayLockVisibility < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :breezway_lock_visible, :boolean, default: true
  end
end
