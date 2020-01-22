class AddTouchscreenAppToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :touchscreen_app, :boolean, :default => true
  end
end
