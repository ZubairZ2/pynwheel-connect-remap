class AddEnableAutoZoomFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :enable_auto_zoom, :boolean, default: true
  end
end
